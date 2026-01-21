use crate::handlers::notification_handler::create_notification;
// use crate::handlers::subscription_handler::UpdateValue;
use crate::handlers::transaction_handler::create_transaction;
use crate::models::notification::Notification;
use crate::models::transaction::PaymentHistory;
use crate::state::AppState;
use crate::types::{SubscriptionField, UpdateValue};
use crate::utils::{find_tier_by_name, parse_tiers};
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address_with_program_id;
use sqlx::Row;
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time;
use tracing::error;

pub async fn run_keeper(state: Arc<AppState>) {
    let interval = Duration::from_secs(60);
    let mut ticker = time::interval(interval);

    loop {
        ticker.tick().await;
        if let Err(err) = scan_and_renew_subscriptions(&state).await {
            error!("Keeper error: {:?}", err);
        }
    }
}

pub async fn scan_and_renew_subscriptions(state: &AppState) -> anyhow::Result<()> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

    let sub = sqlx::query(
        r#"
        SELECT
            payer,
            tier_name,
            plan_pda,
            next_payment_ts,
            auto_renew,
            active,
            amount,
            unique_seed,
            bump,
            subscription_pda AS subscription
        FROM subscriptions
        WHERE active = true
          AND next_payment_ts <= $1
        ORDER BY next_payment_ts ASC
        LIMIT 1
        "#,
    )
    .bind(now)
    .fetch_optional(&state.db)
    .await?;

    let Some(sub) = sub else {
        tracing::info!("✅ No subscriptions due for renewal");
        return Ok(());
    };
    let subscription_pda = Pubkey::from_str(sub.get("subscription"))?;

    let plan_opt = state
        .solana
        .get_plan(Pubkey::from_str(sub.get("plan_pda"))?)
        .await?;

    let plan = match plan_opt {
        Some(p) => p,
        None => {
            tracing::warn!("Plan not found for subscription {}", subscription_pda);
            return Ok(());
        }
    };
    let tier_name: String = sub.get("tier_name"); // Fetch tier name for context
    if !sub.get::<bool, _>("auto_renew") {
        let notification = Notification {
            id: None,
            user_pubkey: Pubkey::from_str(sub.get("payer"))?.to_string(),
            plan_name: plan.name.clone(),
            tier: tier_name.clone(),
            subscription_pda: subscription_pda.to_string(),
            title: "Subscription Expired".to_string(),
            message: format!(
                "Your subscription for {} ({}) has ended.",
                plan.name, tier_name
            ),
            created_at: Some(chrono::Utc::now()),
            is_read: false,
            r#type: "warning".to_string(),
        };

        let _ = create_notification(&state.db, &notification).await;

        if let Err(e) =
            update_subscription_active(state, &subscription_pda.to_string(), false).await
        {
            tracing::error!(
                "Failed to deactivate expired subscription {}: {}",
                subscription_pda,
                e
            );
        } else {
            tracing::info!("Deactivated expired subscription {}", subscription_pda);
        }

        return Ok(());
    }
    // 🔁 Delegate to reusable renewer
    renew_subscription_by_pda(state, subscription_pda).await
}

pub async fn renew_subscription_by_pda(
    state: &AppState,
    subscription_pda: Pubkey,
) -> anyhow::Result<()> {
    let sub = sqlx::query(
        r#"
        SELECT
            payer,
            tier_name,
            plan_pda,
            next_payment_ts,
            auto_renew,
            amount,
            unique_seed,
            bump,
            subscription_pda AS subscription
        FROM subscriptions
        WHERE subscription_pda = $1
        LIMIT 1
        "#,
    )
    .bind(subscription_pda.to_string())
    .fetch_optional(&state.db)
    .await?;

    let Some(sub) = sub else {
        tracing::warn!("Subscription not found: {}", subscription_pda);
        return Ok(());
    };

    let payer_pubkey = Pubkey::from_str(sub.get("payer"))?;

    let plan_opt = state
        .solana
        .get_plan(Pubkey::from_str(sub.get("plan_pda"))?)
        .await?;

    let plan = match plan_opt {
        Some(p) => p,
        None => {
            tracing::warn!("Plan not found for subscription {}", subscription_pda);
            return Ok(());
        }
    };

    let tiers = parse_tiers(&plan.tiers)?;
    let tier = find_tier_by_name(&tiers, sub.get("tier_name"))?;

    let token_program = state.solana.rpc.get_account(&plan.mint).await?;

    let payer_token_account = get_associated_token_address_with_program_id(
        &payer_pubkey,
        &plan.mint,
        &token_program.owner,
    );

    state
        .solana
        .rpc
        .get_account(&payer_token_account)
        .await
        .map_err(|_| {
            anyhow::anyhow!("User token account {} does not exist", payer_token_account)
        })?;

    let receiver_token_account = get_associated_token_address_with_program_id(
        &plan.receiver,
        &plan.mint,
        &token_program.owner,
    );

    let amount: u64 = sub.get::<i64, _>("amount") as u64;
    let period_seconds: i64 = tier.period_seconds.parse()?;

    let result = state
        .solana
        .execute_subscription_payment(
            subscription_pda,
            Pubkey::from_str(sub.get("plan_pda"))?,
            payer_token_account,
            receiver_token_account,
            plan.mint,
            token_program.owner,
            amount,
            period_seconds,
        )
        .await;

    let (notification_title, notification_message, notification_type) = match result {
        Ok(signature) => {
            let next_ts = sub.get::<i64, _>("next_payment_ts") + period_seconds;

            sqlx::query!(
                r#"
                UPDATE subscriptions
                SET next_payment_ts = $1
                WHERE subscription_pda = $2
                "#,
                next_ts,
                subscription_pda.to_string()
            )
            .execute(&state.db)
            .await?;
            let tier_name: String = sub.get("tier_name");

            let history = PaymentHistory {
                id: None,
                user_pubkey: payer_pubkey.to_string(),
                plan: plan.name.clone(),
                tier: tier_name.clone(),
                amount: amount as i64,
                status: "success".to_string(),
                tx_signature: Some(signature.to_string()),
                subscription_pda: subscription_pda.to_string(),
                created_at: chrono::Utc::now(),
            };

            let _ = create_transaction(&state.db, &history).await;

            (
                "Payment Received".to_string(), // Clear Title
                format!("You successfully renewed {} ({})", plan.name, tier_name),
                "success".to_string(), // UI Type (Green Icon)
            )
        }

        Err(e) => {
            tracing::error!("❌ Renewal failed {}: {}", subscription_pda, e);
            (
                "Payment Failed".to_string(), // Clear Title
                format!(
                    "We could not renew your subscription for {}. Please check your wallet balance.",
                    plan.name
                ),
                "error".to_string(), // UI Type (Red Icon)
            )
        }
    };

    let notification = Notification {
        id: None,
        user_pubkey: payer_pubkey.to_string(),
        plan_name: plan.name,
        tier: sub.get("tier_name"),
        subscription_pda: subscription_pda.to_string(),
        title: notification_title,
        message: notification_message,
        created_at: Some(chrono::Utc::now()),
        is_read: false,
        r#type: notification_type,
    };

    let _ = create_notification(&state.db, &notification).await;

    Ok(())
}

pub async fn update_subscription_active(
    state: &AppState,
    subscription_pda: &str,
    active: bool,
) -> anyhow::Result<()> {
    let result = sqlx::query!(
        r#"
        UPDATE subscriptions
        SET active = $1
        WHERE subscription_pda = $2
        "#,
        active,
        subscription_pda
    )
    .execute(&state.db)
    .await;
    // .context("Failed to execute database query to update subscription active status")?;
    let updated = result?.rows_affected() == 1;

    if !updated {
        tracing::warn!(
            "No subscription found with PDA {} to update active status",
            subscription_pda
        );
    } else {
        tracing::info!(
            "Successfully updated active status to {} for subscription {}",
            active,
            subscription_pda
        );
        state
            .solana
            .update_subscription_status(
                Pubkey::from_str(subscription_pda)?,
                SubscriptionField::Active, // Select the field
                UpdateValue::Bool(false),  // Set the value to false
            )
            .await?;
    }

    Ok(())
}

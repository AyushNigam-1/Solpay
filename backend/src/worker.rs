use crate::handlers::notification_handler::create_notification;
use crate::handlers::transaction_handler::create_transaction;
use crate::models::notification::Notification;
use crate::models::transaction::PaymentHistory;
use crate::state::AppState;
use crate::utils::{find_tier_by_name, parse_tiers};
use anchor_lang::prelude::feature::state;
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

    // loop {
    //     ticker.tick().await;
    //     if let Err(err) = scan_and_renew_subscriptions(&state).await {
    //         error!("Keeper error: {:?}", err);
    //     }
    // }
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

    if !sub.get::<bool, _>("auto_renew") {
        let notification = Notification {
            id: None,
            user_pubkey: Pubkey::from_str(sub.get("payer"))?.to_string(),
            plan_name: plan.name.clone(),
            tier: sub.get("tier_name"),
            subscription_pda: subscription_pda.to_string(),
            message: "⛔ Subscription has been expired".to_string(),
            created_at: Some(chrono::Utc::now()),
            is_read: false,
            r#type: "Expired".to_string(),
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

    // 🔕 Auto-renew OFF → expired notification

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

    let (notification_message, notification_type) = match result {
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

            let history = PaymentHistory {
                id: None,
                user_pubkey: payer_pubkey.to_string(),
                plan: plan.name.clone(),
                tier: sub.get("tier_name"),
                amount: amount as i64,
                status: "success".to_string(),
                tx_signature: Some(signature.to_string()),
                subscription_pda: subscription_pda.to_string(),
                created_at: chrono::Utc::now(),
            };

            let _ = create_transaction(&state.db, &history).await;

            (
                "✅ Subscription renewed successfully".to_string(),
                "Success".to_string(),
            )
        }

        Err(e) => {
            tracing::error!("❌ Renewal failed {}: {}", subscription_pda, e);
            (
                "❌ Subscription renewal failed".to_string(),
                "Failed".to_string(),
            )
        }
    };

    let notification = Notification {
        id: None,
        user_pubkey: payer_pubkey.to_string(),
        plan_name: plan.name,
        tier: sub.get("tier_name"),
        subscription_pda: subscription_pda.to_string(),
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
    }

    Ok(())
}

// async fn scan_and_renew_subscriptions(state: &AppState) -> anyhow::Result<()> {
//     let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

//     let sub = sqlx::query(
//         r#"
//             SELECT
//                 payer,
//                 tier_name,
//                 plan_pda,
//                 next_payment_ts,
//                 auto_renew,
//                 active,
//                 unique_seed,
//                 bump,
//                 subscription_pda AS subscription
//             FROM subscriptions
//             WHERE active = true
//             AND next_payment_ts <= $1
//             ORDER BY next_payment_ts ASC
//             LIMIT 1
//             "#,
//     )
//     .bind(now)
//     .fetch_optional(&state.db)
//     .await?;

//     println!("{:?}", sub);
//     let Some(sub) = sub else {
//         tracing::info!("✅ No subscriptions due for renewal");
//         return Ok(());
//     };

//     let subscription_pda = Pubkey::from_str(sub.get("subscription"))?;

//     let plan_opt = state
//         .solana
//         .get_plan(Pubkey::from_str(sub.get("plan_pda"))?)
//         .await?;

//     let plan = match plan_opt {
//         Some(p) => p,
//         None => {
//             tracing::warn!("Plan not found for subscription");
//             return Ok(()); // or continue loop
//         }
//     };
//     // 🔕 Auto-renew OFF → subscription expired notification
//     if !sub.get::<bool, _>("auto_renew") {
//         let payer_pubkey = Pubkey::from_str(sub.get("payer"))?;

//         let notification = Notification {
//             id: None,
//             user_pubkey: payer_pubkey.to_string(),
//             plan_name: sub.get("tier_name"),
//             tier: sub.get("tier_name"),
//             subscription_pda: sub.get("subscription"),
//             message: "⛔ Subscription has been expired (auto-renew is off)".to_string(),
//             created_at: Some(chrono::Utc::now()),
//             is_read: false,
//             r#type: "Expired".to_string(),
//         };

//         if let Err(e) = create_notification(&state.db, &notification).await {
//             tracing::error!("❌ Failed to insert expired notification: {}", e);
//         }

//         tracing::info!("⛔ Subscription expired (auto-renew disabled)");
//         return Ok(()); // ⛔ stop processing
//     }

//     let tiers = parse_tiers(&plan.tiers)?;

//     let tier = find_tier_by_name(&tiers, sub.get("tier_name"))?;

//     let payer_pubkey = Pubkey::from_str(sub.get("payer"))?;

//     let token_program = state.solana.rpc.get_account(&plan.mint).await?;

//     let payer_token_account = get_associated_token_address_with_program_id(
//         &payer_pubkey,
//         &plan.mint,
//         &token_program.owner,
//     );

//     if state
//         .solana
//         .rpc
//         .get_account(&payer_token_account)
//         .await
//         .is_err()
//     {
//         anyhow::bail!(
//             "User token account {} does not exist. User must receive tokens first.",
//             payer_token_account
//         );
//     }

//     let receiver_token_account = get_associated_token_address_with_program_id(
//         &plan.receiver,
//         &plan.mint,
//         &token_program.owner,
//     );

//     // // ----------------------------
//     println!("{:?},{:?}", plan, tiers);

//     let amount: u64 = tier.amount.parse()?;
//     let period_seconds: i64 = tier.period_seconds.parse()?;
//     // ⛓ Execute on-chain payment
//     let result = state
//         .solana
//         .execute_subscription_payment(
//             subscription_pda,
//             Pubkey::from_str(sub.get("plan_pda"))?,
//             payer_token_account,
//             receiver_token_account,
//             plan.mint,
//             token_program.owner,
//             amount,
//             period_seconds,
//         )
//         .await;

//     let notification_message: String;
//     let notification_type;

//     match result {
//         Ok(signature) => {
//             let next_ts = sub.get::<i64, _>("next_payment_ts") + period_seconds;
//             sqlx::query!(
//                 r#"
//             UPDATE subscriptions
//             SET next_payment_ts = $1
//             WHERE subscription_pda = $2
//             "#,
//                 next_ts,
//                 subscription_pda.to_string()
//             )
//             .execute(&state.db)
//             .await?;

//             let history = PaymentHistory {
//                 id: None,
//                 user_pubkey: payer_pubkey.to_string(),
//                 plan: plan.name.to_string(),
//                 tier: sub.get("tier_name"),
//                 amount: amount as i64,
//                 status: "success".to_string(),
//                 tx_signature: Some(signature.to_string()),
//                 subscription_pda: subscription_pda.to_string(),
//                 created_at: chrono::Utc::now(),
//             };

//             if let Err(e) = create_transaction(&state.db, &history).await {
//                 tracing::error!("❌ Failed to save payment history: {}", e);
//             }
//             notification_message = format!("✅ Subscription renewed successfully");
//             notification_type = "Success";
//             tracing::info!(
//                 "✅ Subscription {} renewed. Next payment at {}",
//                 subscription_pda,
//                 next_ts
//             );
//         }

//         Err(e) => {
//             tracing::error!(
//                 "❌ Failed to renew subscription {}: {}",
//                 subscription_pda,
//                 e
//             );
//             notification_message = format!("❌ Subscription renewal failed");
//             notification_type = "Failed";
//         }
//     }

//     let notification = Notification {
//         id: None,
//         user_pubkey: payer_pubkey.to_string(),
//         plan_name: plan.name.to_string(),
//         tier: sub.get("tier_name"),
//         subscription_pda: subscription_pda.to_string(),
//         message: notification_message,
//         created_at: Some(chrono::Utc::now()),
//         is_read: false,
//         r#type: notification_type.to_string(),
//     };

//     if let Err(e) = create_notification(&state.db, &notification).await {
//         tracing::error!("❌ Failed to insert notification: {}", e);
//     }
//     Ok(())
// }

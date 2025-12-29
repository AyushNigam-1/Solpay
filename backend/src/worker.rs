use crate::handlers::notification_handler::create_notification;
use crate::handlers::transaction_handler::create_transaction;
use crate::models::notification::Notification;
use crate::models::transaction::PaymentHistory;
use crate::state::AppState;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
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

fn parse_tiers(tiers: &[u8]) -> Result<Vec<Tier>> {
    // 1️⃣ bytes → string
    let tiers_str =
        std::str::from_utf8(tiers).map_err(|e| anyhow!("Invalid UTF-8 in tiers: {}", e))?;

    // 2️⃣ string → JSON → Vec<Tier>
    let parsed: Vec<Tier> = serde_json::from_str(tiers_str)
        .map_err(|e| anyhow!("Failed to parse tiers JSON: {}", e))?;

    Ok(parsed)
}

pub fn find_tier_by_name<'a>(tiers: &'a [Tier], tier_name: &str) -> Result<&'a Tier> {
    tiers
        .iter()
        .find(|t| t.tier_name == tier_name)
        .ok_or_else(|| anyhow!("Tier '{}' not found in plan", tier_name))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier {
    pub tier_name: String,
    pub amount: String, // or u64 if you want to parse
    pub period_seconds: String,
    pub description: String,
}

async fn scan_and_renew_subscriptions(state: &AppState) -> anyhow::Result<()> {
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
                unique_seed,
                bump,
                subscription_pda AS subscription
            FROM subscriptions
            WHERE auto_renew = true
            AND active = true
            AND next_payment_ts <= $1
            ORDER BY next_payment_ts ASC
            LIMIT 1
            "#,
    )
    .bind(now)
    .fetch_optional(&state.db)
    .await?;

    println!("{:?}", sub);
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
            tracing::warn!("Plan not found for subscription");
            return Ok(()); // or continue loop
        }
    };

    let tiers = parse_tiers(&plan.tiers)?;

    let tier = find_tier_by_name(&tiers, sub.get("tier_name"))?;

    let payer_pubkey = Pubkey::from_str(sub.get("payer"))?;

    let token_program = state.solana.rpc.get_account(&plan.mint).await?;

    let payer_token_account = get_associated_token_address_with_program_id(
        &payer_pubkey,
        &plan.mint,
        &token_program.owner,
    );

    if state
        .solana
        .rpc
        .get_account(&payer_token_account)
        .await
        .is_err()
    {
        anyhow::bail!(
            "User token account {} does not exist. User must receive tokens first.",
            payer_token_account
        );
    }

    let receiver_token_account = get_associated_token_address_with_program_id(
        &plan.receiver,
        &plan.mint,
        &token_program.owner,
    );

    // // ----------------------------
    println!("{:?},{:?}", plan, tiers);

    let amount: u64 = tier.amount.parse()?;
    let period_seconds: i64 = tier.period_seconds.parse()?;
    // ⛓ Execute on-chain payment
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

    let mut notification_message: String;
    let mut notification_type;

    match result {
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
                user_pubkey: payer_pubkey.to_string(),
                company: plan.name.to_string(),
                token_mint: plan.mint.to_string(),
                amount: amount as i64,
                status: "success".to_string(),
                tx_signature: Some(signature.to_string()),
                created_at: chrono::Utc::now(),
            };

            if let Err(e) = create_transaction(&state.db, &history).await {
                tracing::error!("❌ Failed to save payment history: {}", e);
            }
            notification_message =
                format!("✅ Subscription renewed successfully. Amount: {}", amount);
            notification_type = "Success";
            tracing::info!(
                "✅ Subscription {} renewed. Next payment at {}",
                subscription_pda,
                next_ts
            );
        }

        Err(e) => {
            tracing::error!(
                "❌ Failed to renew subscription {}: {}",
                subscription_pda,
                e
            );
            notification_message = format!("❌ Subscription renewal failed. Reason: {}", e);
            notification_type = "Failed";
        }
    }

    let notification = Notification {
        id: None,
        user_pubkey: payer_pubkey.to_string(),
        plan_name: plan.name.to_string(),
        subscription_pda: subscription_pda.to_string(),
        message: notification_message,
        created_at: Some(chrono::Utc::now()),
        is_read: false,
        r#type: notification_type.to_string(),
    };

    if let Err(e) = create_notification(&state.db, &notification).await {
        tracing::error!("❌ Failed to insert notification: {}", e);
    }
    Ok(())
}

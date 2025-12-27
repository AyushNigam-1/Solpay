use crate::state::AppState;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address;
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
            WHERE auto_renew = false
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

    let subscription_pda = Pubkey::from_str(sub.get("subscription"));

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

    let payer_pubkey = Pubkey::from_str(sub.get("payer"))?;

    let payer_token_account = get_associated_token_address(&payer_pubkey, &plan.mint);

    let receiver_token_account = get_associated_token_address(&plan.receiver, &plan.mint);

    let token_program = state.solana.rpc.get_account(&plan.mint).await?;
    // // ----------------------------
    println!("{:?},{:?}", plan, tiers);
    // // ⛓ Execute on-chain payment
    let result = state
        .solana
        .execute_subscription_payment(
            subscription_pda?,
            Pubkey::from_str(sub.get("plan_pda"))?,
            payer_token_account,
            receiver_token_account,
            plan.mint,
            token_program.owner,
        )
        .await;

    // match result {
    //     Ok(_) => {
    //         let next_ts = sub.get("next_payment_ts") + sub.get("period_seconds");

    //         sqlx::query!(
    //             r#"
    //             UPDATE subscriptions
    //             SET next_payment_ts = $1
    //             WHERE subscription_pda = $2
    //             "#,
    //             next_ts,
    //             subscription_pda
    //         )
    //         .execute(&state.db)
    //         .await?;

    //         tracing::info!(
    //             "✅ Subscription {} renewed. Next payment at {}",
    //             subscription_pda,
    //             next_ts
    //         );
    //     }

    //     Err(e) => {
    //         tracing::error!(
    //             "❌ Renewal failed for {}: {} (will retry)",
    //             sub.subscription,
    //             e
    //         );
    //         // DB untouched → retry next cycle
    //     }
    // }

    Ok(())
}

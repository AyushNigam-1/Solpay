// use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub payer: String,
    pub mint: String,
    pub tier_name: String,
    pub plan_pda: String,
    pub vault_token_account: String,
    pub payer_token_account: String,
    pub next_payment_ts: String,
    pub auto_renew: bool,
    pub active: bool,
    pub unique_seed: [u8; 8],
    pub bump: u8,
    pub subscription: String,
}

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct Subscription {
//     pub public_key: String,
//     pub account: SubscriptionAccount,
// }

// use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub payer: String,
    pub tier_name: String,
    pub plan_pda: String,
    pub next_payment_ts: String,
    pub auto_renew: bool,
    pub active: bool,
    pub unique_seed: [u8; 8],
    pub bump: u8,
    pub subscription: String,
    pub tx_signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier {
    pub tier_name: String,
    pub amount: String, // or u64 if you want to parse
    pub period_seconds: String,
    pub description: String,
}

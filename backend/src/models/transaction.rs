use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentHistory {
    pub user_pubkey: String,
    pub company: String,
    pub token_mint: String,
    pub amount: i64,
    pub status: String, // "pending" | "success" | "failed"
    pub tx_signature: Option<String>,
    pub created_at: DateTime<Utc>, // ✅ FIX
}

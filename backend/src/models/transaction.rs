use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentHistory {
    pub user_pubkey: String,
    pub plan: String, // ✅ renamed
    pub tier: String, // ✅ new
    pub amount: i64,
    pub status: String,
    pub tx_signature: Option<String>,
    pub subscription_pda: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

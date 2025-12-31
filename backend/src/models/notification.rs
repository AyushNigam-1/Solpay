use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: Option<uuid::Uuid>,
    pub plan_name: String,
    pub tier: String,
    pub user_pubkey: String,
    pub subscription_pda: String,
    pub message: String,
    pub created_at: Option<DateTime<Utc>>,
    pub is_read: bool,
    pub r#type: String,
}

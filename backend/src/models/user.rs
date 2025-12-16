use crate::models::subscription::Subscription;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::types::Json;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct User {
    pub address: String,
    pub subscription: Json<Vec<Subscription>>,
}

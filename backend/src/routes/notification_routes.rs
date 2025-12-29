use crate::handlers::notification_handler::get_notifications;
use axum::{Router, routing::get};

pub fn notification_routes() -> Router {
    Router::new().route("/notifications/{user_pubkey}", get(get_notifications))
}

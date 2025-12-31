use crate::handlers::notification_handler::{delete_notification, get_notifications};
use axum::{
    Router,
    routing::{delete, get},
};

pub fn notification_routes() -> Router {
    Router::new()
        .route("/notifications/{user_pubkey}", get(get_notifications))
        .route("/notifications/:id", delete(delete_notification))
}

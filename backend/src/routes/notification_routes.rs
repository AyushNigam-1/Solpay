use crate::handlers::notification_handler::{
    delete_notification, get_notifications, mark_notifications_as_read,
};
use axum::{
    Router,
    routing::{delete, get, put},
};

pub fn notification_routes() -> Router {
    Router::new()
        .route("/notifications/user/{user_pubkey}", get(get_notifications))
        .route(
            "/notifications/{notification_id}",
            delete(delete_notification),
        )
        .route(
            "/api/notifications/read/{user_pubkey}",
            put(mark_notifications_as_read),
        )
}

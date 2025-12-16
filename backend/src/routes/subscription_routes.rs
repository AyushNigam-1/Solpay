use crate::handlers::subscription_handler::{
    create_subscription, delete_subscription, get_subscriptions,
};
use axum::{Router, routing::get}; // Import your shared state type

pub fn escrow_routes() -> Router {
    Router::new().route(
        "/subscriptions/{address}",
        get(get_subscriptions)
            .post(create_subscription)
            .delete(delete_subscription), // .put(update_escrow)
    )
}

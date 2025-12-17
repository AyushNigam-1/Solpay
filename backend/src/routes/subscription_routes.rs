use crate::handlers::subscription_handler::{
    create_subscription, delete_subscription, get_subscriptions, update_subscription,
};
use axum::{
    Router,
    routing::{get, post},
}; // Import your shared state type

pub fn subscription_routes() -> Router {
    Router::new()
        .route(
            "/subscriptions/{subscription_pda}",
            get(get_subscriptions)
                .delete(delete_subscription)
                .patch(update_subscription),
        )
        .route("/subscriptions", post(create_subscription))
}

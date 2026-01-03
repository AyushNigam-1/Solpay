use crate::handlers::subscription_handler::{
    create_subscription, delete_subscription, get_subscriptions, get_subscriptions_by_creator,
    renew_subscription, update_subscription,
};
use axum::{
    Router,
    routing::{get, post},
};

pub fn subscription_routes() -> Router {
    Router::new()
        .route(
            "/subscriptions/{subscription_pda}",
            get(get_subscriptions)
                .delete(delete_subscription)
                .patch(update_subscription)
                .post(renew_subscription),
        )
        .route("/subscriptions", post(create_subscription))
        .route(
            "/subscriptions/creator/:creator_pubkey",
            get(get_subscriptions_by_creator),
        )
}

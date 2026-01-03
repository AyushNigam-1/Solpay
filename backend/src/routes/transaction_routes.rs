use crate::handlers::transaction_handler::{
    delete_transaction, get_subscription_transactions, get_transactions,
};
use axum::{
    Router,
    routing::{delete, get},
};

pub fn transaction_routes() -> Router {
    Router::new()
        .route("/transactions/user/{user_pubkey}", get(get_transactions))
        .route(
            "/transactions/{user_pubkey}/{subscription_pda}",
            get(get_subscription_transactions),
        )
        .route(
            "/transactions/{id}",
            delete(delete_transaction), // ← new delete route
        )
}

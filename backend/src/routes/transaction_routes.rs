use crate::handlers::transaction_handler::{get_transactions, get_user_company_transactions};
use axum::{Router, routing::get};

pub fn transaction_routes() -> Router {
    Router::new()
        .route("/transactions/{user_pubkey}", get(get_transactions))
        .route(
            "/transactions/{user_pubkey}/{company}",
            get(get_user_company_transactions),
        )
}

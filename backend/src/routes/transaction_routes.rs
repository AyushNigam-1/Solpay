use crate::handlers::transaction_handler::get_transactions;
use axum::{Router, routing::get};

pub fn transaction_routes() -> Router {
    Router::new().route("/transactions/{user_pubkey}", get(get_transactions))
}

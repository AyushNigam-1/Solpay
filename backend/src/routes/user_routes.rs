use crate::handlers::user_handler::get_or_create_user;
use axum::{Router, routing::get};

pub fn user_routes() -> Router {
    Router::new().route("/user/{address}", get(get_or_create_user))
}

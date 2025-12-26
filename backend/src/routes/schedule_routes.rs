use crate::handlers::schedule_handler::schedule_subscription;
use axum::{Router, routing::post};
pub fn schedule_routes() -> Router {
    Router::new().route("/schedule-subscription", post(schedule_subscription))
}

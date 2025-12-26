pub mod schedule_routes;
pub mod subscription_routes;
pub mod user_routes;
use axum::Router;

pub fn create_routes() -> Router {
    Router::new()
        .merge(user_routes::user_routes())
        .merge(subscription_routes::subscription_routes())
        .merge(schedule_routes::schedule_routes())
}

use axum::{Extension, Router};
use dotenvy::dotenv;
use std::env;
use std::sync::Arc;
use tokio::net::TcpListener;
mod handlers;
mod models;
mod routes;
mod state;
mod utils;
mod worker;
use crate::state::AppState;
use tower_http::cors::Any;
use tower_http::cors::CorsLayer;
use tracing_subscriber;
mod solana_client;
mod types;
use crate::worker::run_keeper;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let solana_url = "https://api.devnet.solana.com";
    let keypair_path = "/home/ayu/.config/solana/id.json";
    let program_id = "DUNyVxYZBG7YvU5Nsbci75stbBnjBtBjjibH6FtVPFaL";

    let app_state = AppState::new(&database_url, solana_url, keypair_path, program_id).await;
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    tokio::spawn(run_keeper(Arc::new(app_state.clone())));

    let app = Router::new()
        .nest("/api", routes::create_routes())
        .layer(cors)
        .layer(Extension(app_state.clone()));

    println!("🚀 Server running on http://127.0.0.1:3000");
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

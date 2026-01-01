use crate::handlers::transaction_handler::create_transaction;
use crate::models::subscription::Subscription;
use crate::worker::renew_subscription_by_pda;
use crate::{AppState, models::transaction::PaymentHistory};
use anyhow::Result;
use axum::{
    extract::{Extension, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

pub async fn create_subscription(
    Extension(state): Extension<AppState>,
    Json(payload): Json<Subscription>,
) -> impl IntoResponse {
    println!("🧾 Subscription data: {:?}", payload);
    let next_payment_ts = match i64::from_str_radix(&payload.next_payment_ts, 16) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid hex timestamp"
                })),
            )
                .into_response();
        }
    };
    let amount = match i64::from_str_radix(&payload.amount, 16) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid hex timestamp"
                })),
            )
                .into_response();
        }
    };
    let result = sqlx::query!(
        r#"
        INSERT INTO subscriptions (
            payer,
            tier_name,
            plan_pda,
            next_payment_ts,
            auto_renew,
            active,
            amount,
            unique_seed,
            bump,
            subscription_pda
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10)
        "#,
        payload.payer,
        payload.tier_name,
        payload.plan_pda,
        next_payment_ts,
        payload.auto_renew,
        payload.active,
        amount,
        &payload.unique_seed,
        payload.bump as i16,
        payload.subscription
    )
    .execute(&state.db)
    .await;

    let (status, body) = match result {
        Ok(_) => {
            // Record initial transaction history (fire and forget)
            let history_record = PaymentHistory {
                id: None,
                user_pubkey: payload.payer.clone(),
                plan: payload.plan_pda.clone(),
                tier: payload.tier_name.clone(),
                amount: amount, // initial subscription — amount handled separately
                status: "success".to_string(),
                tx_signature: Some(payload.tx_signature), // if you have it
                subscription_pda: payload.subscription.clone(),
                created_at: chrono::Utc::now(),
            };
            if let Err(e) = create_transaction(&state.db, &history_record).await {
                eprintln!("Failed to record transaction history: {:?}", e);
                // Don't fail the whole request
            }
            (
                StatusCode::CREATED,
                json!({
                    "message": "Subscription created successfully",
                    "subscription_pda": payload.subscription
                }),
            )
        }
        Err(sqlx::Error::Database(db_err))
            if db_err.constraint() == Some("subscriptions_pkey")
                || db_err.constraint() == Some("subscriptions_subscription_pda_key") =>
        {
            eprintln!("Duplicate subscription PDA: {}", payload.subscription);
            (
                StatusCode::CONFLICT,
                json!({ "error": "Subscription already exists" }),
            )
        }
        Err(e) => {
            eprintln!("Failed to create subscription: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({ "error": "Failed to create subscription" }),
            )
        }
    };

    (status, Json(body)).into_response()
}

#[derive(Serialize, Deserialize, Debug)]
pub enum UpdateValue {
    Bool(bool),
    String(String),
}
#[derive(Deserialize)]
pub struct UpdateSubscriptionField {
    pub field: String,
    pub value: UpdateValue,
}

pub async fn update_subscription(
    Extension(state): Extension<AppState>,
    Path(subscription_pda): Path<String>,
    Json(payload): Json<UpdateSubscriptionField>,
) -> impl IntoResponse {
    // Run the query based on field
    let result = match payload.field.as_str() {
        "autoRenew" => {
            if let UpdateValue::Bool(b) = payload.value {
                sqlx::query!(
                    "UPDATE subscriptions SET auto_renew = $1 WHERE subscription_pda = $2",
                    b,
                    &subscription_pda
                )
                .execute(&state.db)
                .await
            } else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "Expected boolean for auto_renew"})),
                )
                    .into_response();
            }
        }
        "active" => {
            if let UpdateValue::Bool(b) = payload.value {
                sqlx::query!(
                    "UPDATE subscriptions SET active = $1 WHERE subscription_pda = $2",
                    b,
                    &subscription_pda
                )
                .execute(&state.db)
                .await
            } else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "Expected boolean for active"})),
                )
                    .into_response();
            }
        }
        "tier" => {
            if let UpdateValue::String(s) = payload.value {
                sqlx::query!(
                    "UPDATE subscriptions SET tier_name = $1 WHERE subscription_pda = $2",
                    &s,
                    &subscription_pda
                )
                .execute(&state.db)
                .await
            } else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "Expected string for tier"})),
                )
                    .into_response();
            }
        }
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid field"})),
            )
                .into_response();
        }
    };

    // Handle DB result
    match result {
        Ok(res) if res.rows_affected() == 0 => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Subscription not found"})),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::OK,
            Json(json!({"message": "Subscription updated successfully"})),
        )
            .into_response(),
        Err(e) => {
            eprintln!("Failed to update subscription: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    }
}

pub async fn get_subscriptions(
    Extension(state): Extension<AppState>,
    Path(address): Path<String>,
) -> Result<Json<Vec<Subscription>>, StatusCode> {
    println!(
        "📩 Incoming request to get escrows for address: {}",
        address
    );
    // Perform the query
    let escrows = sqlx::query_as::<_, (sqlx::types::Json<Vec<Subscription>>,)>(
        r#"SELECT subscriptions FROM "users2" WHERE address = $1"#,
    )
    .bind(&address)
    .fetch_one(&state.db)
    .await;

    match escrows {
        Ok((escrows_json,)) => {
            println!(
                "✅ Successfully fetched escrows for address {}: {:?}",
                address, escrows_json.0
            );
            Ok(Json(escrows_json.0))
        }
        Err(sqlx::Error::RowNotFound) => {
            eprintln!("⚠️ No user found for address: {}", address);
            Err(StatusCode::NOT_FOUND)
        }
        Err(e) => {
            eprintln!("❌ Database query failed for address {}: {:?}", address, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn delete_subscription(
    Extension(state): Extension<AppState>,
    Path(subscription_pda): Path<String>,
) -> impl IntoResponse {
    println!("🗑️ Deleting subscription: {}", subscription_pda);

    let result = sqlx::query!(
        r#"
        DELETE FROM subscriptions
        WHERE subscription_pda = $1
        "#,
        subscription_pda
    )
    .execute(&state.db)
    .await;

    match result {
        Ok(res) if res.rows_affected() == 0 => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Subscription not found" })),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "message": "Subscription deleted successfully" })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("Failed to delete subscription: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to delete subscription" })),
            )
                .into_response()
        }
    }
}

pub async fn renew_subscription(
    Extension(state): Extension<AppState>,
    Path(subscription_pda): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let subscription_pda = Pubkey::from_str(&subscription_pda)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid subscription PDA".into()))?;

    renew_subscription_by_pda(&state, subscription_pda)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Renewal failed: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Subscription renewal triggered"
    })))
}

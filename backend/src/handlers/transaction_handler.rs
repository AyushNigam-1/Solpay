use crate::models::transaction::PaymentHistory;
use crate::state::AppState;
use anyhow::Result;
use axum::{
    Json,
    extract::{Extension, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;
use sqlx::PgPool;

pub async fn create_transaction(db: &PgPool, record: &PaymentHistory) -> Result<()> {
    if record.amount <= 0 {
        anyhow::bail!("amount must be greater than zero");
    }

    if !matches!(record.status.as_str(), "pending" | "success" | "failed") {
        anyhow::bail!("invalid payment status");
    }

    sqlx::query!(
        r#"
        INSERT INTO payment_history (
            user_pubkey,
            plan,
            tier,
            amount,
            status,
            tx_signature,
            subscription_pda,
            created_at )
        VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
        "#,
        record.user_pubkey,
        record.plan,
        record.tier,
        record.amount,
        record.status,
        record.tx_signature,
        record.subscription_pda,
        record.created_at
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_transactions(
    Extension(state): Extension<AppState>,
    Path(user_pubkey): Path<String>,
) -> Result<Json<Vec<PaymentHistory>>, (StatusCode, String)> {
    let records = sqlx::query_as!(
        PaymentHistory,
        r#"
        SELECT
            id,
            user_pubkey, 
            plan,
            tier,
            amount,
            status,
            tx_signature,
            subscription_pda,
            created_at
        FROM payment_history
        WHERE user_pubkey = $1
        ORDER BY created_at DESC
        "#,
        user_pubkey
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("DB error: {}", e),
        )
    })?;

    Ok(Json(records))
}

pub async fn get_subscription_transactions(
    Extension(state): Extension<AppState>,
    Path((user_pubkey, subscription_pda)): Path<(String, String)>,
) -> Result<Json<Vec<PaymentHistory>>, (StatusCode, String)> {
    let records = sqlx::query_as!(
        PaymentHistory,
        r#"
        SELECT
            id,
            user_pubkey,
            plan,
            tier,
            amount,
            status,
            tx_signature,
            subscription_pda,
            created_at
        FROM payment_history
        WHERE user_pubkey = $1 AND subscription_pda = $2
        ORDER BY created_at DESC
        "#,
        user_pubkey,
        subscription_pda
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("DB error: {}", e),
        )
    })?;

    Ok(Json(records))
}

/// DELETE /transactions/:tx_signature/:user_pubkey
/// Deletes a specific transaction if it belongs to the user
pub async fn delete_transaction(
    Extension(state): Extension<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        DELETE FROM payment_history
        WHERE id = $1
        "#,
        &id
    )
    .execute(&state.db)
    .await;

    match result {
        Ok(res) if res.rows_affected() == 1 => (
            StatusCode::OK,
            Json(json!({
                "message": "Transaction record deleted successfully"
            })),
        )
            .into_response(),

        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Transaction not found or does not belong to you"
            })),
        )
            .into_response(),

        Err(e) => {
            eprintln!("Failed to delete transaction: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to delete transaction"
                })),
            )
                .into_response()
        }
    }
}

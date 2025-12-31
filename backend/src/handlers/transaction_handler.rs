use crate::models::transaction::PaymentHistory;
use crate::state::AppState;
use anyhow::Result;
use axum::{
    Json,
    extract::{Extension, Path},
    http::StatusCode,
};
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

pub async fn get_user_company_transactions(
    Extension(state): Extension<AppState>,
    Path((user_pubkey, company_name)): Path<(String, String)>,
) -> Result<Json<Vec<PaymentHistory>>, (StatusCode, String)> {
    let records = sqlx::query_as!(
        PaymentHistory,
        r#"
        SELECT
            user_pubkey,
            plan,
            tier,
            amount,
            status,
            tx_signature,
            subscription_pda,
            created_at
        FROM payment_history
        WHERE user_pubkey = $1 AND plan = $2
        ORDER BY created_at DESC
        "#,
        user_pubkey,
        company_name
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

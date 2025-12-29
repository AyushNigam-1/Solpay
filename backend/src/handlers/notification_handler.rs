use crate::models::notification::Notification;
use crate::state::AppState;
use axum::{Extension, Json, extract::Path};
use sqlx::PgPool;

pub async fn create_notification(db: &PgPool, notification: &Notification) -> anyhow::Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO notifications (
            user_pubkey,
            subscription_pda,
            plan_name,
            message,
            is_read,
            type
        )
        VALUES ($1, $2, $3, $4,$5,$6)
        "#,
        notification.user_pubkey,
        notification.subscription_pda,
        notification.plan_name,
        notification.message,
        notification.is_read,
        notification.r#type,
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_notifications(
    Path(user_pubkey): Path<String>,
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<Notification>>, axum::http::StatusCode> {
    let records = sqlx::query_as!(
        Notification,
        r#"
        SELECT
            id,
            user_pubkey,
            plan_name,
            subscription_pda,
            message,
            created_at,
            is_read,
            type as "type"
        FROM notifications
        WHERE user_pubkey = $1
        ORDER BY created_at DESC
        "#,
        user_pubkey
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(records))
}

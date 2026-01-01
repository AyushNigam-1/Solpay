use crate::models::notification::Notification;
use crate::state::AppState;
use axum::{Extension, Json, extract::Path, response::IntoResponse};
use hyper::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn create_notification(db: &PgPool, notification: &Notification) -> anyhow::Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO notifications (
            user_pubkey,
            subscription_pda,
            plan_name,
            tier,
            message,
            is_read,
            type
        )
        VALUES ($1, $2, $3, $4,$5,$6,$7)
        "#,
        notification.user_pubkey,
        notification.subscription_pda,
        notification.plan_name,
        notification.tier,
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
            tier,
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

pub async fn delete_notification(
    Path(notification_id): Path<String>,
    Extension(state): Extension<AppState>,
) -> impl IntoResponse {
    let notification_id = match Uuid::parse_str(&notification_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid UUID format").into_response();
        }
    };
    let result = sqlx::query!(
        r#"
        DELETE FROM notifications
        WHERE id = $1
        "#,
        notification_id,
    )
    .execute(&state.db)
    .await;

    match result {
        Ok(res) if res.rows_affected() == 1 => (
            StatusCode::OK,
            Json(json!({
                "message": "Notification deleted successfully"
            })),
        )
            .into_response(),

        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Notification not found or does not belong to you"
            })),
        )
            .into_response(),

        Err(e) => {
            eprintln!("Failed to delete notification: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to delete notification"
                })),
            )
                .into_response()
        }
    }
}

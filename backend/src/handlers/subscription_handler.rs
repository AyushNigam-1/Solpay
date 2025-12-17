use crate::AppState;
use crate::models::subscription::Subscription;
use anyhow::Result;
use axum::{
    extract::{Extension, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;

pub async fn create_subscription(
    Extension(state): Extension<AppState>,
    // Path(address): Path<String>,
    Json(payload): Json<Subscription>,
) -> impl IntoResponse {
    // println!("📩 Creating subscription for user: {}", address);
    println!("🧾 Subscription data: {:?}", payload);

    // Optional: Verify user exists (thanks to FK, it will fail anyway if not)
    // let user_exists: Result<(i32,), sqlx::Error> =
    //     sqlx::query_as("SELECT 1 FROM users2 WHERE address = $1")
    //         .bind(&address)
    //         .fetch_optional(&state.db)
    //         .await;

    // match user_exists {
    //     Ok(Some(_)) => {} // user exists
    //     Ok(None) => {
    //         eprintln!("⚠️ User not found: {}", address);
    //         return (StatusCode::NOT_FOUND, "User not found").into_response();
    //     }
    //     Err(e) => {
    //         eprintln!("Database error checking user: {:?}", e);
    //         return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
    //     }
    // }

    // Insert new subscription
    let result = sqlx::query!(
        r#"
        INSERT INTO subscriptions (
            payer,
            tier_name,
            plan_pda,
            next_payment_ts,
            auto_renew,
            active,
            unique_seed,
            bump,
            subscription_pda
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        payload.payer,
        payload.tier_name,
        payload.plan_pda,
        payload.next_payment_ts,
        payload.auto_renew,
        payload.active,
        &payload.unique_seed,
        payload.bump as i16,
        payload.subscription
    )
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            // println!("✅ Subscription created successfully for {}", address);
            (
                StatusCode::CREATED,
                Json(serde_json::json!({
                    "message": "Subscription created successfully",
                    "subscription_pda": payload.subscription
                })),
            )
                .into_response()
        }
        Err(sqlx::Error::Database(db_err))
            if db_err.constraint() == Some("subscriptions_pkey")
                || db_err.constraint() == Some("subscriptions_subscription_pda_key") =>
        {
            eprintln!("Duplicate subscription PDA: {}", payload.subscription);
            (
                StatusCode::CONFLICT,
                Json(serde_json::json!({ "error": "Subscription already exists" })),
            )
                .into_response()
        }
        Err(e) => {
            eprintln!("Failed to create subscription: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to create subscription" })),
            )
                .into_response()
        }
    }
}
use serde::Deserialize;

#[derive(Deserialize)]
pub struct UpdateSubscriptionField {
    pub field: String,
    pub value: bool,
}
pub async fn update_subscription(
    Extension(state): Extension<AppState>,
    Path(subscription_pda): Path<String>,
    Json(payload): Json<UpdateSubscriptionField>,
) -> impl IntoResponse {
    println!(
        "✏️ Updating subscription {}: {} = {}",
        subscription_pda, payload.field, payload.value
    );

    let result = match payload.field.as_str() {
        "active" => {
            sqlx::query!(
                r#"
                UPDATE subscriptions
                SET active = $1
                WHERE subscription_pda = $2
                "#,
                payload.value,
                subscription_pda
            )
            .execute(&state.db)
            .await
        }
        "auto_renew" => {
            sqlx::query!(
                r#"
                UPDATE subscriptions
                SET auto_renew = $1
                WHERE subscription_pda = $2
                "#,
                payload.value,
                subscription_pda
            )
            .execute(&state.db)
            .await
        }
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Invalid field name" })),
            )
                .into_response();
        }
    };

    match result {
        Ok(res) if res.rows_affected() == 0 => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Subscription not found" })),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "message": "Subscription updated successfully" })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("Failed to update subscription: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to update subscription" })),
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

// Step 2: Find and filter out the escrow to delete
// let initial_count = escrows.len();

// We filter the list, keeping only the escrows whose unique_seed DOES NOT match
// the one sent in the request.
// escrows.retain(|e| e.public_key != escrow_pda);

// if escrows.len() == initial_count {
//     // If the length didn't change, the escrow wasn't found.
//     println!(
//         "⚠️ Escrow with unique_seed {} not found in list.",
//         escrow_pda
//     );
//     return Err(StatusCode::NOT_FOUND);
// }

// println!("➖ Removed 1 escrow. New count: {}", escrows.len());

// // Step 3: Update the record with the filtered array
// println!("💾 Updating user {}’s escrows in the database…", address);
// let res = sqlx::query!(
//     r#"UPDATE users SET escrows = $1 WHERE address = $2"#,
//     sqlx::types::Json(&escrows) as _,
//     address
// )
// .execute(&state.db)
// .await;

// match res {
//     Ok(_) => {
//         println!("✅ Escrow successfully deleted for user {}", address);
//         Ok((
//             StatusCode::OK,
//             Json(json!({"message": "Escrow deleted successfully"})),
//         ))
//     }
//     Err(e) => {
//         eprintln!(
//             "❌ Failed to update escrows after deletion for {}: {:?}",
//             address, e
//         );
//         Err(StatusCode::INTERNAL_SERVER_ERROR)
//     }
// }
//     Ok((
//         StatusCode::OK,
//         Json(json!({"message": "Escrow deleted successfully"})),
//     ))
// }

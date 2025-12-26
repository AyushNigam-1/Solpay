use axum::{
    extract::{Extension, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    message::{AccountMeta, Message},
    pubkey::Pubkey,
    signature::{Signer, read_keypair_file},
    transaction::Transaction,
};
// use tuktuk_sdk::{
//     instruction::{QueueTaskV0Args, queue_task_v0},
//     state::Trigger,
// };
use crate::models::schedule::{ScheduleRequest, ScheduleResponse};
use tuktuk_sdk::{
    pda::task::TaskQueue,
    types::{
        CompiledInstructionV0, CompiledTransactionV0, QueueTaskArgsV0, TransactionSourceV0,
        TriggerV0,
    },
};

pub async fn schedule_subscription(Json(payload): Json<ScheduleRequest>) -> impl IntoResponse {
    let subscription_pda = Pubkey::from_str(&payload.subscription_pda).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid subscription PDA".to_string(),
        )
    })?;

    let plan_pda = Pubkey::from_str(&payload.plan_pda)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid plan PDA".to_string()))?;

    let user_token_account = Pubkey::from_str(&payload.user_token_account).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid user token account".to_string(),
        )
    })?;

    let receiver_token_account =
        Pubkey::from_str(&payload.receiver_token_account).map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Invalid receiver token account".to_string(),
            )
        })?;

    let mint = Pubkey::from_str(&payload.mint)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid mint".to_string()))?;

    let token_program = Pubkey::from_str(&payload.token_program)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid token program".to_string()))?;

    let execute_at_ts = payload.execute_at_ts;

    // Load payer keypair
    let payer = read_keypair_file("/home/ayu/.config/solana/id.json").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to read keypair".to_string(),
        )
    })?;

    // Build your execute_payment instruction
    let execute_payment_ix = Instruction {
        program_id: crate::ID, // your program ID
        accounts: vec![
            AccountMeta::new(subscription_pda, false),
            AccountMeta::new_readonly(plan_pda, false),
            AccountMeta::new(user_token_account, false),
            AccountMeta::new(receiver_token_account, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(token_program, false),
            // add other accounts if needed
        ],
        data: vec![], // no args, or your discriminator + args
    };

    // Use official SDK to build queue_task_v0 ix
    let queue_task_ix = queue_task_v0(
        &TUKTUK_PROGRAM_ID,
        &TASK_QUEUE_PUBKEY,
        &payer.pubkey(),
        Trigger::Timestamp { ts: execute_at_ts },
        tuktuk_sdk::state::TransactionSource::CompiledV0 {
            accounts: execute_payment_ix
                .accounts
                .iter()
                .map(|am| am.pubkey)
                .collect(),
            instructions: vec![execute_payment_ix.into()],
        },
        "Subscription renewal".to_string(),
    );

    // RPC client
    let rpc = RpcClient::new("https://api.devnet.solana.com".to_string());

    let recent_blockhash = rpc.get_latest_blockhash().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to get blockhash".to_string(),
        )
    })?;

    let message = Message::new(&[queue_task_ix], Some(&payer.pubkey()));
    let mut tx = Transaction::new_unsigned(message);
    tx.try_sign(&[&payer], recent_blockhash).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to sign tx".to_string(),
        )
    })?;

    let sig = rpc.send_and_confirm_transaction(&tx).map_err(|e| {
        eprintln!("Send tx failed: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Transaction failed".to_string(),
        )
    })?;

    Ok(Json(ScheduleResponse {
        success: true,
        tx_signature: sig.to_string(),
    }))
}

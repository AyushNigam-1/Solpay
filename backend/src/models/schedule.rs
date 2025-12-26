use borsh::BorshSerialize;
use serde::Deserialize;
use serde::Serialize;

#[derive(Deserialize)]
pub struct ScheduleRequest {
    pub subscription_pda: String,
    pub plan_pda: String,
    pub user_token_account: String,
    pub receiver_token_account: String,
    pub mint: String,
    pub token_program: String, // usually TOKEN_PROGRAM_ID or TOKEN_2022
    pub execute_at_ts: i64,
}

#[derive(Serialize)]
pub struct ScheduleResponse {
    pub success: bool,
    pub tx_signature: String,
}

#[derive(BorshSerialize)]
pub struct QueueTaskArgs {
    pub trigger: Trigger,
    pub transaction: Vec<u8>,
    pub description: String,
}

#[derive(BorshSerialize)]
pub enum Trigger {
    Timestamp { unix_timestamp: i64 },
}

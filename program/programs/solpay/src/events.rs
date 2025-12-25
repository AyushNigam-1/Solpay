use anchor_lang::prelude::*;

#[event]
pub struct SubscriptionInitialized {
    pub subscription: Pubkey,
    pub payer: Pubkey,
    pub tier_name: String,
    pub plan_pda: String,
    pub auto_renew: bool,
    pub active: bool,
    pub bump: u8,
    pub unique_seed: [u8; 8],
}

#[event]
pub struct SubscriptionTopup {
    pub subscription: Pubkey,
    pub topup_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentExecuted {
    pub subscription: Pubkey,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub next_payment_ts: i64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentFailed {
    pub subscription: Pubkey,
    pub reason: u8,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscription: Pubkey,
    pub payer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawnRemaining {
    pub subscription: Pubkey,
    pub payer: Pubkey,
    pub withdrawn_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ScheduleUpdated {
    pub subscription: Pubkey,
    pub new_amount: u64,
    pub new_period_seconds: i64,
    pub timestamp: i64,
}

#[event]
pub struct GlobalStatsInitialized {
    pub bump: u8,
    pub timestamp: i64,
}

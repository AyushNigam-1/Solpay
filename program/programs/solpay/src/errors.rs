use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Numerical overflow")]
    NumericalOverflow,
    #[msg("Subscription still active")]
    SubscriptionActive,
    #[msg("Subscription still active")]
    IncorrectMint,
    #[msg("")]
    InvalidFieldValue,
    #[msg("Payment is not due yet")]
    PaymentNotDue = 6000,
    #[msg("Failed to decompress subscription tiers")]
    DecompressionFailed,
    #[msg("Failed to deserialize subscription tiers")]
    TierDeserializationFailed,
    #[msg("Subscription tier not found")]
    TierNotFound,
}

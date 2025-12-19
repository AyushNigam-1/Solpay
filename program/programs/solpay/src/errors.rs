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
}

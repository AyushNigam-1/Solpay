use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Subscription is inactive")]
    SubscriptionInactive,
    #[msg("Payment not due yet")]
    PaymentNotDue,
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

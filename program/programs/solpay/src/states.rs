use anchor_lang::prelude::*;
use crate::constants::*;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface,
};
use crate::errors::ErrorCode;
use anchor_spl::associated_token::AssociatedToken; 

#[derive(Accounts)]
pub struct InitializeGlobalStats<'info> {
    #[account(
      init,
      payer = payer,
      seeds = [GLOBAL_STATS_SEED],
      bump,
      space = 8 + GlobalStats::INIT_SPACE
    )]
    pub global_stats: Account<'info, GlobalStats>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier_name:String,plan_pda:String , period_seconds: i64, auto_renew: bool,prefunding_amount: u64, duration: u64, unique_seed: [u8; 8])]
pub struct InitializeSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Subscription PDA
    #[account(
        init,
        payer = payer,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SUBSCRIPTION_SEED, payer.key().as_ref() , unique_seed.as_ref()], 
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    /// Vault token account (PDA owned token account)
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = subscription,
        token::token_program = token_program,  // ← THIS LINE IS REQUIRED
        seeds = [VAULT_SEED, subscription.key().as_ref()],
        bump
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
            mut,
            token::mint = mint,
            token::authority = payer,
        )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    /// Mint for this subscription
    pub mint:InterfaceAccount<'info, Mint>,
    /// CHECK: The payee key is only saved for later payment processing. It is not used for direct signing or transfer authority in this instruction.
    // pub payee: UncheckedAccount<'info>,
    // #[account(
    //     mut,
    //     constraint = payee_token_account.mint == mint.key(),
    //     constraint = payee_token_account.owner == payee.key(),
    // )]
    // pub payee_token_account: InterfaceAccount<'info, TokenAccount>,
    /// Global stats (singleton)
    #[account(mut, seeds = [GLOBAL_STATS_SEED], bump = global_stats.bump)]
    pub global_stats: Account<'info, GlobalStats>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ManageVault<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        has_one = payer @ ErrorCode::Unauthorized,
        // Only payer can manage
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        constraint = vault_token_account.owner == subscription.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = payer,
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Subscription account (PDA)
    #[account(mut, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref() ,subscription.unique_seed.as_ref()], bump = subscription.bump)]
    pub subscription: Account<'info, Subscription>,

    /// Vault token account (owned by subscription PDA)
    #[account(mut, constraint = vault_token_account.owner == subscription.key())]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Mint for the token
    pub mint: InterfaceAccount<'info, Mint>,

    /// Payee token account (destination)
    #[account(mut)]
    pub payee_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Global stats (mutable)
    #[account(mut, seeds = [GLOBAL_STATS_SEED], bump = global_stats.bump)]
    pub global_stats: Account<'info, GlobalStats>,

    /// Token program
pub token_program: Interface<'info, TokenInterface>
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, close = payer, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref(), subscription.unique_seed.as_ref()], bump = subscription.bump)]
    pub subscription: Account<'info, Subscription>,

    /// Vault token account (owned by subscription PDA)
    #[account(mut, constraint = vault_token_account.owner == subscription.key())]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Mint for the token
    pub mint: InterfaceAccount<'info, Mint>,

    /// Payer token account (destination for refund)
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Global stats (mutable)
    #[account(mut, seeds = [GLOBAL_STATS_SEED], bump = global_stats.bump)]
    pub global_stats: Account<'info, GlobalStats>,

    pub token_program: Interface<'info, TokenInterface>
}


#[derive(Accounts)]
pub struct UpdateSubscriptionStatus<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        has_one = payer @ ErrorCode::Unauthorized
    )]
    pub subscription: Account<'info, Subscription>,
}

#[derive(Accounts)]
pub struct CreatePlan<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + PlanAccount::INIT_SPACE,
        seeds = [b"plan", creator.key().as_ref()],
        bump
    )]
    pub plan: Account<'info, PlanAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: This is safe — used only to derive receiver's ATA. No signing, no ownership checks needed.
    pub receiver: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = receiver,
        associated_token::token_program = token_program,
    )]
    pub receiver_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelPlan<'info> {
    #[account(mut)]
    /// The creator of the plan (must sign to cancel).
    pub creator: Signer<'info>,

    #[account(
        mut,
        close = creator,
        seeds = [b"plan", creator.key().as_ref()],
        bump = plan.bump,
        has_one = creator @ ErrorCode::Unauthorized,
    )]
    pub plan: Account<'info, PlanAccount>,

}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VaultAction {
    Fund,
    Withdraw,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum UpdateValue {
    Bool(bool),
    U64(u64),
    String(String)
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum SubscriptionField {
    AutoRenew,
    Active,
    Duration,
    Tier
}
// --- UPDATE PLAN CONTEXT ---
#[derive(Accounts)]
#[instruction(new_amount: Option<u64>, new_period: Option<i64>, new_active_status: Option<bool>)]
pub struct UpdatePlan<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [PLAN_SEED, creator.key().as_ref(), plan.name.as_bytes()],
        bump = plan.bump,
        has_one = creator @ ErrorCode::Unauthorized,
    )]
    pub plan: Account<'info, PlanAccount>,
}


#[account]
#[derive(InitSpace)]
pub struct PlanAccount {
    pub creator: Pubkey,
    pub token:Pubkey,
    pub mint: Pubkey,
    #[max_len(64)]
    pub name: String,  // e.g., "Spotify Premium Pack"
    pub receiver :Pubkey,
    #[max_len(10)]
    pub token_symbol : String,
    #[max_len(100)]
    pub token_image : String,
    #[max_len(1000)] 
    pub tiers: Vec<u8>,// Array of plans
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[derive(InitSpace)]
pub struct SubscriptionTier {
    #[max_len(32)]
    pub tier_name: String,  // "Basic"
    pub amount: u64,        // $10 in USDC
    pub period_seconds: i64, // 2592000 (1 month)
    #[max_len(300)]
    pub description :String
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SubscriptionUpdateField {
    Amount,
    PeriodSeconds,
}

#[account]
#[derive(InitSpace)]  
pub struct Subscription {
    pub payer: Pubkey,
    #[max_len(32)]   
    pub tier_name :String,
    #[max_len(32)]   
    pub plan_pda:String,
    #[max_len(300)]
    pub payer_token_account: Pubkey,
    pub mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub next_payment_ts: u64,
    pub auto_renew: bool,
    pub active: bool,
    pub duration :i64,
    pub bump: u8,
    pub unique_seed: [u8; 8],
    pub prefunded_amount: u64,  // ← shows how much was deposited
}

#[account]
#[derive(InitSpace)]  // ← THIS IS MAGIC
pub struct GlobalStats {
    pub total_subscriptions: u64,
    pub total_payments_executed: u64,
    pub total_value_released: u128,
    pub bump: u8,
}

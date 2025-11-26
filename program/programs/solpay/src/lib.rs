use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface, TransferChecked, CloseAccount,
};
// Program id - replace with your actual program id from Anchor.toml / `anchor build`
declare_id!("DSPgJHR4uWN8tL24eZjASof6a3oxtemVA2KCmLpSWU2b");

pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";
pub const VAULT_SEED: &[u8] = b"vault";
pub const GLOBAL_STATS_SEED: &[u8] = b"global_stats";

#[program]
pub mod recurring_payments {
    use anchor_spl::token_interface;

    use super::*;
    pub fn initialize_global_stats(ctx: Context<InitializeGlobalStats>) -> Result<()> {
        let stats = &mut ctx.accounts.global_stats;
        stats.total_subscriptions = 0;
        stats.total_payments_executed = 0;
        stats.total_value_released = 0;
        stats.bump = ctx.bumps.global_stats;
        emit!(GlobalStatsInitialized {
            bump: stats.bump,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Create a subscription and initialize PDA-owned vault token account.
    /// Payer is required to be signer and fund the rent for new accounts.
#[allow(clippy::too_many_arguments)]
pub fn initialize_subscription(
    ctx: Context<InitializeSubscription>,
    amount: u64,                    // Amount per payment (e.g. 50 USDC)
    period_seconds: i64,
    first_payment_ts: i64,
    auto_renew: bool,
    prefunding_amount: u64,         // ← NEW: how much to deposit upfront (0 = none)
    unique_seed: [u8; 8], // ← FIX: Added missing argument
) -> Result<()> {
    // 1. DEPOSIT TOKENS (only if prefunding_amount > 0)
    if prefunding_amount > 0 {
        require!(
            ctx.accounts.payer_token_account.amount >= prefunding_amount,
            ErrorCode::InsufficientFunds
        );

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.payer_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token_interface::transfer_checked(
            cpi_ctx,
            prefunding_amount,
            ctx.accounts.mint.decimals,
        )?;
    }

    // 2. INITIALIZE SUBSCRIPTION STATE
    let subscription = &mut ctx.accounts.subscription;
    subscription.payer = ctx.accounts.payer.key();
    subscription.payee = ctx.accounts.payee.key();
    subscription.mint = ctx.accounts.mint.key();
    subscription.amount = amount;
    subscription.period_seconds = period_seconds;
    subscription.next_payment_ts = first_payment_ts;
    subscription.auto_renew = auto_renew;
    subscription.active = true;
    subscription.payer_token_account = ctx.accounts.payer_token_account.key();
    subscription.payee_token_account = ctx.accounts.payee_token_account.key();
    subscription.vault_token_account = ctx.accounts.vault_token_account.key();
    subscription.bump = ctx.bumps.subscription;
    subscription.unique_seed = unique_seed;  // ← FIXED: Save unique seed
    // 3. UPDATE GLOBAL STATS
    let stats = &mut ctx.accounts.global_stats;
    stats.total_subscriptions = stats
        .total_subscriptions
        .checked_add(1)
        .ok_or(ErrorCode::NumericalOverflow)?;

    // 4. EMIT EVENT
    emit!(SubscriptionInitialized {
        subscription: subscription.key(),
        payer: subscription.payer,
        payee: subscription.payee,
        amount,
        period_seconds,
        next_payment_ts: first_payment_ts,
        prefunded_amount: prefunding_amount,  // ← optional: add to event
    });

    Ok(())
}

    /// Top up the vault token account (user sends SPL tokens directly to vault).
    /// This instruction simply emits an event that a top-up occurred; the actual transfer
    /// is generally done by the client wallet via SPL transfer to the vault address.
pub fn topup_subscription(ctx: Context<TopupSubscription>, topup_amount: u64) -> Result<()> {
    // 1. PERFORM THE TOKEN TRANSFER
    
    // CPI Context for the Token Transfer from Payer to Vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.payer_token_account.to_account_info(), // SOURCE: Payer's ATA
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),   // DESTINATION: Subscription Vault
        authority: ctx.accounts.payer.to_account_info(),          // AUTHORITY: Payer (Signer)
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // Call the SPL Token Program to move the tokens.
    // This will fail if the payer_token_account does not have sufficient funds.
    token_interface::transfer_checked(
        cpi_ctx, 
        topup_amount, 
        ctx.accounts.mint.decimals
    )?;
    
    // 2. EMIT EVENT
    // The event is only emitted if the transfer was successful, ensuring atomicity.
    emit!(SubscriptionTopup {
        subscription: ctx.accounts.subscription.key(),
        topup_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        let clock = Clock::get()?;
        let subscription = &mut ctx.accounts.subscription; // MUTABLE BORROW

        require!(subscription.active, ErrorCode::SubscriptionInactive);
        require!(
            clock.unix_timestamp >= subscription.next_payment_ts,
            ErrorCode::PaymentNotDue
        );

        // ---- Check Vault Balance ----
        let vault_amount = ctx.accounts.vault_token_account.amount;
        require!(
            vault_amount >= subscription.amount,
            ErrorCode::InsufficientFunds
        );

        // ---- PDA Signer Seeds ----accounts
        let seeds = &[
            SUBSCRIPTION_SEED,
            subscription.payer.as_ref(),
            &[subscription.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // ---- CPI TRANSFER ----
        // FIX: Pass the .to_account_info() directly into the struct fields.
        // The authority must be the AccountInfo of the Subscription PDA.
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.payee_token_account.to_account_info(),
            authority: subscription.to_account_info(), // Use the mutable reference to get the AccountInfo for the CPI
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        // The temporary immutable borrow for the CPI is fully contained here.
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token_interface::transfer_checked(
            // Assuming 'token' is the correct module
            cpi_ctx,
            subscription.amount,
            ctx.accounts.mint.decimals,
        )?;
        // The CPI is complete, and the immutable borrow is dropped, allowing the mutable borrow to continue.

        // ---- Update next payment timestamp ----
        // MUTABLE BORROW USED AGAIN
        subscription.next_payment_ts = subscription
            .next_payment_ts
            .checked_add(subscription.period_seconds as i64)
            .ok_or(error!(ErrorCode::NumericalOverflow))?;

        // ---- Update global stats ----
        // let stats = &mut ctx.accounts.global_stats;

        // ... (rest of the stats update logic)
        // ---- Emit Event ----
        emit!(PaymentExecuted {
            subscription: subscription.key(),
            payer: subscription.payer,
            payee: subscription.payee,
            amount: subscription.amount,
            next_payment_ts: subscription.next_payment_ts,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let clock = Clock::get()?;
        let subscription = &mut ctx.accounts.subscription; // MUTABLE BORROW STARTS HERE

        // --- Authorization ---
        require_keys_eq!(
            subscription.payer,
            *ctx.accounts.payer.key,
            ErrorCode::Unauthorized
        );

        // --- Prepare signer seeds ---
        let seeds = &[
            SUBSCRIPTION_SEED,
            subscription.payer.as_ref(),
            &[subscription.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // --- Refund any remaining balance from vault ---
        let vault_amount = ctx.accounts.vault_token_account.amount;

        if vault_amount > 0 {
            // FIX 1: Pass .to_account_info() directly into the CPI struct.
            // This avoids holding multiple simultaneous immutable references (AccountInfo clones)
            // that conflict with the primary mutable reference ('subscription').
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.payer_token_account.to_account_info(),
                authority: subscription.to_account_info(), // Use mutable ref temporarily as immutable AccountInfo
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );

            token_interface::transfer_checked(cpi_ctx, vault_amount, ctx.accounts.mint.decimals)?;
            // Use `token` module
        }

        // --- Close vault account back to payer ---
        // FIX 2: Pass .to_account_info() directly into the CPI struct.
        let cpi_accounts_close = CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(), // Vault to be closed
            destination: ctx.accounts.payer.to_account_info(),           // payer receives rent
            authority: subscription.to_account_info(), // Subscription PDA is the authority
        };

        let cpi_ctx_close = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_close,
            signer_seeds,
        );

        token_interface::close_account(cpi_ctx_close)?; // Use `token` module
                                              // --- Deactivate subscription ---
                                              // MUTABLE BORROW IS USED HERE AGAIN
        subscription.active = false;

        // --- Update global stats ---
        let stats = &mut ctx.accounts.global_stats; // NEW MUTABLE BORROW

        stats.total_subscriptions = stats
            .total_subscriptions
            .checked_sub(1)
            .ok_or(error!(ErrorCode::NumericalOverflow))?;

        emit!(SubscriptionCancelled {
            subscription: subscription.key(),
            payer: subscription.payer,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_remaining(ctx: Context<WithdrawRemaining>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription; // MUTABLE BORROW starts

        require!(!subscription.active, ErrorCode::SubscriptionActive);
        require_keys_eq!(
            subscription.payer,
            *ctx.accounts.payer.key,
            ErrorCode::Unauthorized
        );

        // --- Prepare Correct PDA Signer Seeds ---
        // FIX 1: Correctly construct the signer seeds. The bump must be a single-byte slice.
        let seeds = &[
            SUBSCRIPTION_SEED,
            subscription.payer.as_ref(),
            &[subscription.bump], // Correctly pass the bump (u8 as &[u8])
        ];
        let signer_seeds = &[&seeds[..]];

        // transfer remaining tokens back (if any)
        let vault_amount = ctx.accounts.vault_token_account.amount;

        if vault_amount > 0 {
            // FIX 2: Pass .to_account_info() directly into the CPI struct.
            // This resolves the conflict between the long-lived mutable borrow (`subscription`)
            // and the temporary immutable borrow required for the CPI authority.
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.payer_token_account.to_account_info(),
                authority: subscription.to_account_info(), // Use mutable reference temporarily for immutable AccountInfo
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

            token_interface::transfer_checked(cpi_ctx, vault_amount, ctx.accounts.mint.decimals)?;
        }

        // close the vault to payer
        // FIX 2 (Applied again): Pass .to_account_info() directly into the CPI struct.
        let cpi_accounts_close = CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(),
            destination: ctx.accounts.payer.to_account_info(),
            authority: subscription.to_account_info(),
        };
        let cpi_ctx_close = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_close,
            signer_seeds,
        );
        token_interface::close_account(cpi_ctx_close)?;

        // No further mutable access to `subscription` is needed, but the original mutable borrow ends here.

        emit!(WithdrawnRemaining {
            subscription: subscription.key(),
            payer: subscription.payer,
            withdrawn_amount: vault_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update schedule parameters (payer only)
    pub fn update_schedule(
        ctx: Context<UpdateSchedule>,
        new_amount: Option<u64>,
        new_period_seconds: Option<i64>,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        require_keys_eq!(
            subscription.payer,
            *ctx.accounts.payer.key,
            ErrorCode::Unauthorized
        );

        if let Some(a) = new_amount {
            subscription.amount = a;
        }
        if let Some(p) = new_period_seconds {
            subscription.period_seconds = p;
        }

        emit!(ScheduleUpdated {
            subscription: subscription.key(),
            new_amount: subscription.amount,
            new_period_seconds: subscription.period_seconds,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

/* ---------------------------
ACCOUNT STRUCTS / CONTEXTS
--------------------------- */

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
#[instruction(amount: u64, period_seconds: i64, first_payment_ts: i64, auto_renew: bool,prefunding_amount: u64, unique_seed: [u8; 8])]
pub struct InitializeSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Subscription PDA
    #[account(
        init,
        payer = payer,
        space = 8 + Subscription::INIT_SPACE,
        // Seeds corrected from previous interactions:
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
    pub payee: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = payee_token_account.mint == mint.key(),
        constraint = payee_token_account.owner == payee.key(),
    )]
    pub payee_token_account: InterfaceAccount<'info, TokenAccount>,
    /// Global stats (singleton)
    #[account(mut, seeds = [GLOBAL_STATS_SEED], bump = global_stats.bump)]
    pub global_stats: Account<'info, GlobalStats>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(topup_amount: u64,unique_seed: [u8; 8])]
pub struct TopupSubscription<'info> {
    #[account(mut)]
    /// CHECK: Must be the original payer of the subscription
    pub payer: Signer<'info>,

    #[account(
        mut, 
        seeds = [SUBSCRIPTION_SEED, payer.key().as_ref(), unique_seed.as_ref()], 
        bump = subscription.bump,
        has_one = payer, // Ensure only the original payer can top up
        has_one = vault_token_account,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        // The vault must be owned by the subscription PDA
        token::authority = subscription,
        token::mint = mint,
        token::token_program = token_program,
        seeds = [VAULT_SEED, subscription.key().as_ref()],
        bump
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    
    /// The payer's token account from which funds are drawn
    #[account(
        mut, 
        token::mint = mint,
        token::authority = payer,
        token::token_program = token_program,
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(address = subscription.mint @ ErrorCode::IncorrectMint)]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Subscription account (PDA)
    #[account(mut, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref()], bump = subscription.bump)]
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

    #[account(mut, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref()], bump = subscription.bump)]
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
pub struct WithdrawRemaining<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref()], bump = subscription.bump)]
    pub subscription: Account<'info, Subscription>,

    #[account(mut, constraint = vault_token_account.owner == subscription.key())]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

pub token_program: Interface<'info, TokenInterface>
}

#[derive(Accounts)]
pub struct UpdateSchedule<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, seeds = [SUBSCRIPTION_SEED, subscription.payer.as_ref()], bump = subscription.bump)]
    pub subscription: Account<'info, Subscription>,
}

/* ---------------------------
ACCOUNT DATA STRUCTS
--------------------------- */

#[account]
#[derive(InitSpace)]  // ← THIS IS MAGIC
pub struct Subscription {
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub payer_token_account: Pubkey,
    pub payee_token_account: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub vault_token_account: Pubkey,
    pub period_seconds: i64,
    pub next_payment_ts: i64,
    pub auto_renew: bool,
    pub active: bool,
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

/* ---------------------------
EVENTS
--------------------------- */

#[event]
pub struct SubscriptionInitialized {
    pub subscription: Pubkey,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub period_seconds: i64,
    pub next_payment_ts: i64,
    pub prefunded_amount:u64
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

/* ---------------------------
ERRORS
--------------------------- */

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
}

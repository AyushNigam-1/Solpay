pub mod constants;
pub mod errors;
pub mod events;
pub mod states;
use crate::errors::ErrorCode;
use crate::{constants::*, events::*, states::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token_interface::{close_account, transfer_checked, CloseAccount, TransferChecked};
// Program id - replace with your actual program id from Anchor.toml / `anchor build`
declare_id!("8zSqDaupmjEdEr1rhox7Ri2poYZjT6ir4Vd6GL2TZ3XT");

#[program]
pub mod recurring_payments {
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

    #[allow(clippy::too_many_arguments)]
    pub fn initialize_subscription(
        ctx: Context<InitializeSubscription>,
        name: String,
        amount: u64, // Amount per payment (e.g. 50 USDC)
        period_seconds: i64,
        first_payment_ts: i64,
        auto_renew: bool,
        prefunding_amount: u64, // ← NEW: how much to deposit upfront (0 = none)
        unique_seed: [u8; 8],   // ← FIX: Added missing argument
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

            transfer_checked(cpi_ctx, prefunding_amount, ctx.accounts.mint.decimals)?;
        }

        // 2. INITIALIZE SUBSCRIPTION STATE
        let subscription = &mut ctx.accounts.subscription;
        subscription.name = name;
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
        subscription.prefunded_amount = prefunding_amount;
        subscription.unique_seed = unique_seed; // ← FIXED: Save unique seed

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
            prefunded_amount: prefunding_amount, // ← optional: add to event
        });

        Ok(())
    }

    pub fn topup_subscription(ctx: Context<TopupSubscription>, topup_amount: u64) -> Result<()> {
        // 1. PERFORM THE TOKEN TRANSFER

        // CPI Context for the Token Transfer from Payer to Vault
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.payer_token_account.to_account_info(), // SOURCE: Payer's ATA
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(), // DESTINATION: Subscription Vault
            authority: ctx.accounts.payer.to_account_info(),        // AUTHORITY: Payer (Signer)
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Call the SPL Token Program to move the tokens.
        // This will fail if the payer_token_account does not have sufficient funds.
        transfer_checked(cpi_ctx, topup_amount, ctx.accounts.mint.decimals)?;

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

        transfer_checked(
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
        let subscription = &mut ctx.accounts.subscription;

        // --- AUTH ---
        require_keys_eq!(
            subscription.payer,
            *ctx.accounts.payer.key,
            ErrorCode::Unauthorized
        );

        // --- PDA Signer Seeds ---
        let seeds = &[
            SUBSCRIPTION_SEED,
            subscription.payer.as_ref(),
            subscription.unique_seed.as_ref(),
            &[subscription.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let vault_amount = ctx.accounts.vault_token_account.amount;

        // --- Refund remaining funds ---
        if vault_amount > 0 {
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.payer_token_account.to_account_info(),
                authority: subscription.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );

            transfer_checked(cpi_ctx, vault_amount, ctx.accounts.mint.decimals)?;
        }

        // --- Close Vault ---
        let cpi_close = CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(),
            destination: ctx.accounts.payer.to_account_info(),
            authority: subscription.to_account_info(),
        };

        let cpi_ctx_close = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_close,
            signer_seeds,
        );

        close_account(cpi_ctx_close)?;

        // --- Update stats ---
        let stats = &mut ctx.accounts.global_stats;
        stats.total_subscriptions = stats
            .total_subscriptions
            .checked_sub(1)
            .ok_or(error!(ErrorCode::NumericalOverflow))?;

        // --- Emit Event ---
        emit!(SubscriptionCancelled {
            subscription: subscription.key(),
            payer: subscription.payer,
            timestamp: clock.unix_timestamp,
        });

        // PDA is auto-closed due to `close = payer` in account constraints
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

            transfer_checked(cpi_ctx, vault_amount, ctx.accounts.mint.decimals)?;
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
        close_account(cpi_ctx_close)?;

        // No further mutable access to `subscription` is needed, but the original mutable borrow ends here.

        emit!(WithdrawnRemaining {
            subscription: subscription.key(),
            payer: subscription.payer,
            withdrawn_amount: vault_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn create_plan(
        ctx: Context<CreatePlan>,
        name: String,
        token_symbol: String,
        token_image: String,
        tiers: Vec<SubscriptionTier>,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;
        plan.creator = ctx.accounts.creator.key();
        plan.mint = ctx.accounts.mint.key();
        plan.receiver = ctx.accounts.receiver.key();
        plan.token_symbol = token_symbol;
        plan.token_image = token_image;
        plan.name = name;
        plan.tiers = tiers;
        plan.bump = ctx.bumps.plan;
        Ok(())
    }

    pub fn cancel_plan(_ctx: Context<CancelPlan>) -> Result<()> {
        // The `close = creator` constraint handles the logic automatically.
        // We just need to emit an event if desired.
        msg!("Plan cancelled and account closed.");
        Ok(())
    }

    // pub fn update_plan(
    //     ctx: Context<UpdatePlan>,
    //     new_amount: Option<u64>,
    //     new_period: Option<i64>,
    //     new_active_status: Option<bool>, // Assuming you add an `active` field to SubscriptionPlan
    // ) -> Result<()> {
    //     let plan = &mut ctx.accounts.plan;

    //     if let Some(amount) = new_amount {
    //         plan.amount = amount;
    //         msg!("Plan amount updated to: {}", amount);
    //     }

    //     if let Some(period) = new_period {
    //         plan.period_seconds = period;
    //         msg!("Plan period updated to: {}", period);
    //     }

    //     Ok(())
    // }

    /// Update schedule parameters (payer only)

    pub fn update_schedule(
        ctx: Context<UpdateSchedule>,
        field: SubscriptionUpdateField, // New enum specifying the field
        new_value_u64: u64,             // New value (as u64, will need casting if i64 is target)
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;

        // --- 1. Authorization Check (Payer Only) ---
        require_keys_eq!(
            subscription.payer,
            *ctx.accounts.payer.key,
            ErrorCode::Unauthorized
        );

        // --- 2. Update Field based on Enum ---
        match field {
            SubscriptionUpdateField::Amount => {
                // Amount is u64 in the struct, so direct assignment is fine
                subscription.amount = new_value_u64;
            }
            SubscriptionUpdateField::PeriodSeconds => {
                // PeriodSeconds is i64 in the struct, so safe conversion/casting is required
                // NOTE: We must ensure the u64 value fits into i64.
                if new_value_u64 > i64::MAX as u64 {
                    return Err(ErrorCode::NumericalOverflow.into());
                }
                subscription.period_seconds = new_value_u64 as i64;

                // OPTIONAL: Reset next payment time if period changes
                // subscription.next_payment_ts = Clock::get()?.unix_timestamp
                //     .checked_add(new_value_u64 as i64)
                //     .ok_or(ErrorCode::NumericalOverflow)?;
            }
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

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
declare_id!("7rX2hvG7Eq2XFAv5WfviYgeyjd2tKoFd4b9i4Ty9ThdS");

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
        tier_name: String,
        plan_pda: String,
        auto_renew: bool,
        prefunding_amount: u64,
        next_payment_ts: u64,
        duration: i64,
        unique_seed: [u8; 8],
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
        subscription.tier_name = tier_name;
        subscription.plan_pda = plan_pda;
        subscription.payer = ctx.accounts.payer.key();
        subscription.mint = ctx.accounts.mint.key();
        subscription.auto_renew = auto_renew;
        subscription.active = true;
        subscription.duration = duration;
        subscription.payer_token_account = ctx.accounts.payer_token_account.key();
        subscription.vault_token_account = ctx.accounts.vault_token_account.key();
        subscription.bump = ctx.bumps.subscription;
        subscription.prefunded_amount = prefunding_amount;
        subscription.next_payment_ts = next_payment_ts;
        subscription.unique_seed = unique_seed; // ← FIXED: Save unique seed

        let stats = &mut ctx.accounts.global_stats;
        stats.total_subscriptions = stats
            .total_subscriptions
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;

        // 4. EMIT EVENT
        // emit!(SubscriptionInitialized {
        //     subscription: subscription.key(),
        //     payer: subscription.payer,
        //     amount,
        //     period_seconds,
        //     prefunded_amount: prefunding_amount, // ← optional: add to event
        // });

        Ok(())
    }

    // pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    //     let clock = Clock::get()?;
    //     let subscription = &mut ctx.accounts.subscription; // MUTABLE BORROW

    //     require!(subscription.active, ErrorCode::SubscriptionInactive);
    //     require!(
    //         clock.unix_timestamp >= subscription.next_payment_ts,
    //         ErrorCode::PaymentNotDue
    //     );

    //     // ---- Check Vault Balance ----
    //     let vault_amount = ctx.accounts.vault_token_account.amount;
    //     require!(
    //         vault_amount >= subscription.amount,
    //         ErrorCode::InsufficientFunds
    //     );

    //     // ---- PDA Signer Seeds ----accounts
    //     let seeds = &[
    //         SUBSCRIPTION_SEED,
    //         subscription.payer.as_ref(),
    //         &[subscription.bump],
    //     ];
    //     let signer_seeds = &[&seeds[..]];

    //     // ---- CPI TRANSFER ----
    //     // FIX: Pass the .to_account_info() directly into the struct fields.
    //     // The authority must be the AccountInfo of the Subscription PDA.
    //     let cpi_accounts = TransferChecked {
    //         from: ctx.accounts.vault_token_account.to_account_info(),
    //         mint: ctx.accounts.mint.to_account_info(),
    //         to: ctx.accounts.payee_token_account.to_account_info(),
    //         authority: subscription.to_account_info(), // Use the mutable reference to get the AccountInfo for the CPI
    //     };

    //     let cpi_program = ctx.accounts.token_program.to_account_info();

    //     // The temporary immutable borrow for the CPI is fully contained here.
    //     let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

    //     transfer_checked(
    //         // Assuming 'token' is the correct module
    //         cpi_ctx,
    //         subscription.amount,
    //         ctx.accounts.mint.decimals,
    //     )?;
    //     // The CPI is complete, and the immutable borrow is dropped, allowing the mutable borrow to continue.

    //     // ---- Update next payment timestamp ----
    //     // MUTABLE BORROW USED AGAIN
    //     subscription.next_payment_ts = subscription
    //         .next_payment_ts
    //         .checked_add(subscription.period_seconds as i64)
    //         .ok_or(error!(ErrorCode::NumericalOverflow))?;

    //     // ---- Update global stats ----
    //     // let stats = &mut ctx.accounts.global_stats;

    //     // ... (rest of the stats update logic)
    //     // ---- Emit Event ----
    //     // emit!(PaymentExecuted {
    //     //     subscription: subscription.key(),
    //     //     payer: subscription.payer,
    //     //     // payee: subscription.payee,
    //     //     amount: subscription.amount,
    //     //     next_payment_ts: subscription.next_payment_ts,
    //     //     timestamp: clock.unix_timestamp,
    //     // });

    //     Ok(())
    // }
    pub fn manage_vault(ctx: Context<ManageVault>, action: VaultAction, amount: u64) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let vault = &ctx.accounts.vault_token_account;

        let seeds = &[
            SUBSCRIPTION_SEED,
            subscription.payer.as_ref(),
            subscription.unique_seed.as_ref(),
            &[subscription.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        match action {
            VaultAction::Fund => {
                // require!(amount > 0, ErrorCode::ZeroAmount);

                let cpi_accounts = TransferChecked {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                };

                let cpi_ctx =
                    CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

                transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

                // UPDATE prefunded_amount
                subscription.prefunded_amount = subscription
                    .prefunded_amount
                    .checked_add(amount)
                    .ok_or(ErrorCode::NumericalOverflow)?;

                // emit!(VaultFunded {
                //     subscription: subscription.key(),
                //     amount,
                //     new_balance: subscription.prefunded_amount,
                //     timestamp: Clock::get()?.unix_timestamp,
                // });
            }

            VaultAction::Withdraw => {
                // require!(amount > 0, ErrorCode::ZeroAmount);
                // require!(vault.amount >= amount, ErrorCode::InsufficientVaultBalance);

                let cpi_accounts = TransferChecked {
                    from: vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.payer_token_account.to_account_info(),
                    authority: subscription.to_account_info(),
                };

                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                );

                transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

                // UPDATE prefunded_amount
                subscription.prefunded_amount = subscription
                    .prefunded_amount
                    .checked_sub(amount)
                    .ok_or(ErrorCode::NumericalOverflow)?;

                // emit!(VaultWithdrawn {
                //     subscription: subscription.key(),
                //     amount,
                //     new_balance: subscription.prefunded_amount,
                //     timestamp: Clock::get()?.unix_timestamp,
                // });
            }
        }

        Ok(())
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let clock = Clock::get()?;
        let subscription = &mut ctx.accounts.subscription;

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
        msg!("Plan cancelled and account closed.");
        Ok(())
    }

    pub fn update_subscription_status(
        ctx: Context<UpdateSubscriptionStatus>,
        field: SubscriptionField,
        value: UpdateValue,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;

        match (field, value) {
            (SubscriptionField::AutoRenew, UpdateValue::Bool(b)) => {
                subscription.auto_renew = b;
            }
            (SubscriptionField::Active, UpdateValue::Bool(b)) => {
                subscription.active = b;
            }
            (SubscriptionField::Duration, UpdateValue::U64(n)) => {
                subscription.duration = n as i64;
            }
            _ => return Err(ErrorCode::InvalidFieldValue.into()),
        }
        Ok(())
    }
}

pub mod constants;
pub mod errors;
pub mod events;
pub mod states;
use crate::errors::ErrorCode;
use crate::{events::*, states::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

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
        next_payment_ts: u64,
        unique_seed: [u8; 8],
    ) -> Result<()> {
        // 2. INITIALIZE SUBSCRIPTION STATE
        let subscription = &mut ctx.accounts.subscription;
        subscription.tier_name = tier_name.clone();
        subscription.plan_pda = plan_pda.clone();
        subscription.payer = ctx.accounts.payer.key();
        subscription.auto_renew = auto_renew;
        subscription.active = true;
        subscription.bump = ctx.bumps.subscription;
        subscription.next_payment_ts = next_payment_ts;
        subscription.unique_seed = unique_seed; // ← FIXED: Save unique seed

        let stats = &mut ctx.accounts.global_stats;
        stats.total_subscriptions = stats
            .total_subscriptions
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;

        emit!(SubscriptionInitialized {
            subscription: ctx.accounts.subscription.key(),
            tier_name: tier_name.to_string(),
            plan_pda: plan_pda.to_string(),
            payer: ctx.accounts.payer.key(),
            auto_renew: auto_renew,
            active: true,
            bump: ctx.bumps.subscription,
            next_payment_ts: next_payment_ts,
            unique_seed: unique_seed,
        });

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

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let clock = Clock::get()?;
        let subscription = &mut ctx.accounts.subscription;
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

        Ok(())
    }

    pub fn create_plan(
        ctx: Context<CreatePlan>,
        name: String,
        token_symbol: String,
        token_image: String,
        tiers: Vec<u8>,
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
            (SubscriptionField::Tier, UpdateValue::String(s)) => {
                subscription.tier_name = s;
            }
            _ => return Err(ErrorCode::InvalidFieldValue.into()),
        }
        Ok(())
    }
}

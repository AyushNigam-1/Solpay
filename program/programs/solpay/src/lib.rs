pub mod constants;
pub mod errors;
pub mod events;
pub mod states;
use crate::errors::ErrorCode;
use crate::{events::*, states::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token_interface::{transfer_checked, TransferChecked};

declare_id!("DUNyVxYZBG7YvU5Nsbci75stbBnjBtBjjibH6FtVPFaL");

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
        plan_pda: Pubkey,
        period_seconds: i64,
        amount: u64,
        auto_renew: bool,
        unique_seed: [u8; 8],
    ) -> Result<()> {
        // 2. INITIALIZE SUBSCRIPTION STATE
        let subscription = &mut ctx.accounts.subscription;
        let next_payment_ts = Clock::get()?.unix_timestamp + period_seconds;
        subscription.tier_name = tier_name.clone();
        subscription.plan_pda = plan_pda.clone();
        subscription.payer = ctx.accounts.payer.key();
        subscription.auto_renew = auto_renew;
        subscription.active = true;
        subscription.bump = ctx.bumps.subscription;
        subscription.unique_seed = unique_seed;
        subscription.amount = amount;
        subscription.next_payment_ts = next_payment_ts;
        subscription.period_seconds = period_seconds;
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
            next_payment_ts: next_payment_ts,
            auto_renew: auto_renew,
            active: true,
            bump: ctx.bumps.subscription,
            unique_seed: unique_seed,
        });

        Ok(())
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        let clock = Clock::get()?;

        // ---------------- MUTATION SCOPE ----------------
        let (amount, _, payer, unique_seed, bump) = {
            let subscription = &mut ctx.accounts.subscription;

            require!(
                clock.unix_timestamp >= subscription.next_payment_ts,
                ErrorCode::PaymentNotDue
            );

            // copy values we need later
            let amount = subscription.amount;
            let period_seconds = subscription.period_seconds;
            let payer = subscription.payer;
            let unique_seed = subscription.unique_seed;
            let bump = subscription.bump;

            // update next payment timestamp
            subscription.next_payment_ts = subscription
                .next_payment_ts
                .checked_add(subscription.period_seconds)
                .ok_or(ErrorCode::NumericalOverflow)?;

            (amount, period_seconds, payer, unique_seed, bump)
        }; // 👈 mutable borrow ENDS HERE

        // ---------------- CPI SCOPE ----------------

        let seeds = &[
            b"subscription",
            payer.as_ref(),
            unique_seed.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.receiver_token_account.to_account_info(),
            authority: ctx.accounts.subscription.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        Ok(())
    }

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
        plan.name = name;
        plan.token_symbol = token_symbol;
        plan.token_image = token_image;
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

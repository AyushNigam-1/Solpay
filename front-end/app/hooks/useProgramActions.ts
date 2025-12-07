import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import Cookies from "js-cookie"
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { fetchTokenMetadata, generateUniqueSeed, getMintProgramId } from "../utils/token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Plan, planQuery, Plans, Subscription, SubscriptionTier } from "../types";

const ACTIVE_STATUS_OFFSET = 225;

export const useProgramActions = () => {
    const { program, getGlobalStatsPDA, PROGRAM_ID } = useProgram()

    async function fetchAllSubscriptionPlans(): Promise<planQuery[]> {
        try {
            console.log(program!.account as any)
            // Fetch ALL plan accounts using .all() with no filter
            const plans = await (program!.account as any).planAccount.all();
            console.log(plans)
            return plans
            // return []
            // Map to clean format
            // return plans.map((plan) => ({
            //     publicKey: plan.publicKey,
            //     account: {
            //         provider: plan.account.provider,
            //         mint: plan.account.mint,
            //         amount: plan.account.amount.toBigInt(),
            //         periodSeconds: plan.account.periodSeconds.toBigInt(),
            //         name: plan.account.name,
            //         bump: plan.account.bump,
            //     },
            // }));
        } catch (error) {
            console.error("Failed to fetch subscription plans:", error);
            return [];
        }
    }
    async function cancelPlan(
        creatorKey: PublicKey | string,
    ): Promise<string | undefined> {

        // 1. Ensure Creator Key is a valid PublicKey
        const creator = new PublicKey(creatorKey.toString());

        console.log(`Cancelling Plan: for creator: ${creator.toBase58()}`);

        // 2. Derive the Plan PDA
        // Seeds must match Rust: [b"plan", creator.key().as_ref(), plan.name.as_bytes()]
        // Note: ensure the seed string "plan" or "subscription_plan" matches your Rust constant PLAN_SEED
        const [planPDA] = PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("plan"), // Check if this is "plan" or "subscription_plan" in your lib.rs
                creator.toBuffer(),
            ],
            PROGRAM_ID
        );

        console.log(`Derived Plan PDA to close: ${planPDA.toBase58()}`);

        try {
            // 3. Construct and Send Transaction
            const tx = await program!.methods
                .cancelPlan() // No arguments for the instruction itself
                .accounts({
                    creator: creator,          // Signer who receives the rent refund
                    plan: planPDA,             // The Plan PDA being closed
                    // systemProgram is often inferred by Anchor, but good to include if needed
                })
                .rpc();

            console.log(`\n✅ Plan Cancelled Successfully!`);
            console.log(`Transaction Signature: ${tx}`);
            console.log(`Account ${planPDA.toBase58()} closed.`);

            return tx;

        } catch (error) {
            console.error("❌ Error cancelling plan:", error);
            if (error instanceof Error) {
                console.error("Error Message:", error.message);
            }
            return undefined;
        }
    }
    async function fetchUserSubscriptions(): Promise<{ account: Subscription; publicKey: PublicKey; }[]> {
        // console.log(`\nAttempting to fetch subscriptions for Payer: ${payerKey.toBase58()}`);
        const payerKey = new PublicKey(Cookies.get("user")!)
        const filters = [
            {
                memcmp: {
                    offset: 8,
                    bytes: payerKey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: ACTIVE_STATUS_OFFSET,
                    bytes: bs58.encode([1]),
                },
            }
        ];

        try {
            const subscriptions = await (program!.account as any).subscription.all();
            console.log(subscriptions, "subs")
            // if (subscriptions.length === 0) {
            //     console.log("✅ No active or inactive subscriptions found for this user.");
            //     return;
            // }

            // const tokenMetadata = fetchTokenMetadata(subscriptions)
            for (const { pubkey, account } of subscriptions) {
                const metadata = await fetchTokenMetadata(new PublicKey(account.mint))
                account.tokenMetadata = metadata
            }
            return subscriptions
            // subscriptions.forEach((subscription: { subscription: { account: Subscription }[] }, index: number) => {
            //     console.log(`\n--- Subscription #${index + 1} ---`);
            //     console.log(`Account Address: ${subscription.publicKey.toBase58()}`);
            //     console.log(`Payer: ${subscription.account.payer.toBase58()}`);
            //     console.log(`Payee: ${subscription.account.payee.toBase58()}`);
            //     console.log(`Amount: ${subscription.account.amount.toString()}`);
            //     console.log(`Active: ${subscription.account.active}`);
            //     console.log(`Next Payment TS: ${new Date(Number(account.nextPaymentTs) * 1000).toLocaleString()}`);
            //     // You can access other fields like: account.account.periodSeconds, account.account.nextPaymentTs, etc.
            // });

        } catch (error) {
            console.error("❌ Error fetching subscriptions:", error);
            return []
        }
    }

    async function initializeSubscription(
        name: string,
        payerKey: web3.PublicKey,
        payeeKey: web3.PublicKey,
        mintKey: web3.PublicKey,
        amount: number | string,
        periodSeconds: number | string,
        prefundingAmount: number | string,
        autoRenew: boolean,

    ): Promise<web3.PublicKey | undefined> {
        console.log(payeeKey, payerKey, mintKey, amount, periodSeconds, autoRenew)
        // Convert numerical inputs to Anchor's Big Number (BN)
        const amountBN = new anchor.BN(amount);
        const periodSecondsBN = new anchor.BN(periodSeconds);
        const prefundingAmountBN = new anchor.BN(prefundingAmount); // NEW BN conversion
        const depositTokenProgramId = await getMintProgramId(mintKey);
        const uniqueSeed = generateUniqueSeed();

        const [subscriptionKey, subscriptionBump] = PublicKey.findProgramAddressSync(
            [
                new TextEncoder().encode("subscription"), // Your custom seed string
                payerKey.toBuffer(),
                uniqueSeed  // ← MUST INCLUDE THIS
            ],
            PROGRAM_ID
        );

        const [vaultTokenAccount, vaultBump] = web3.PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("vault"),
                subscriptionKey.toBuffer(), // Seed the vault with the Subscription PDA itself
            ],
            PROGRAM_ID
        );
        const globalStatsPDA = getGlobalStatsPDA(PROGRAM_ID); // NEW: Global stats PDA
        const payerTokenAccount = getAssociatedTokenAddressSync(
            mintKey,
            payerKey,
            false, // Allow owner to be PDA if needed, but here owner is Payer (wallet)
            depositTokenProgramId, // Use the correct token program ID
        );
        const payeeTokenAccount = getAssociatedTokenAddressSync(
            mintKey,
            payeeKey,
            false,
            depositTokenProgramId
        )
        //         write a frontend function to call this function #[derive(Accounts)]
        // #[instruction(name:String,amount: u64, period_seconds: i64, auto_renew: bool,prefunding_amount: u64, unique_seed: [u8; 8])]
        // pub struct InitializeSubscription<'info> {
        //     #[account(mut)]
        //     pub payer: Signer<'info>,
        //     /// Subscription PDA
        //     #[account(
        //         init,
        //         payer = payer,
        //         space = 8 + Subscription::INIT_SPACE,
        //         seeds = [SUBSCRIPTION_SEED, payer.key().as_ref() , unique_seed.as_ref()],
        //         bump
        //     )]
        //     pub subscription: Account<'info, Subscription>,
        //     /// Vault token account (PDA owned token account)
        //     #[account(
        //         init,
        //         payer = payer,
        //         token::mint = mint,
        //         token::authority = subscription,
        //         token::token_program = token_program, // ← THIS LINE IS REQUIRED
        //         seeds = [VAULT_SEED, subscription.key().as_ref()],
        //         bump
        //     )]
        //     pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
        //     #[account(
        //             mut,
        //             token::mint = mint,
        //             token::authority = payer,
        //         )]
        //     pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
        //     /// Mint for this subscription
        //     pub mint:InterfaceAccount<'info, Mint>,
        //     /// CHECK: The payee key is only saved for later payment processing. It is not used for direct signing or transfer authority in this instruction.
        //     pub payee: UncheckedAccount<'info>,
        //     #[account(
        //         mut,
        //         constraint = payee_token_account.mint == mint.key(),
        //         constraint = payee_token_account.owner == payee.key(),
        //     )]
        //     pub payee_token_account: InterfaceAccount<'info, TokenAccount>,
        //     /// Global stats (singleton)
        //     #[account(mut, seeds = [GLOBAL_STATS_SEED], bump = global_stats.bump)]
        //     pub global_stats: Account<'info, GlobalStats>,
        //     pub system_program: Program<'info, System>,
        //     pub token_program: Interface<'info, TokenInterface>,
        //     pub rent: Sysvar<'info, Rent>,
        // }
        try {
            const tx = await program!.methods
                .initializeSubscription(
                    name,
                    amountBN,
                    periodSecondsBN,
                    autoRenew,
                    prefundingAmountBN,
                    [...uniqueSeed],
                )
                .accounts({
                    // payer: payerKey,
                    // subscription: subscriptionKey,
                    // vaultTokenAccount: vaultTokenAccount,
                    // payerTokenAccount: payerTokenAccount,
                    // mint: mintKey,
                    // payee: payeeKey,
                    // payeeTokenAccount: payeeTokenAccount,
                    // globalStats: globalStatsPDA,
                    // systemProgram: web3.SystemProgram.programId,
                    // tokenProgram: depositTokenProgramId,
                    // rent: web3.SYSVAR_RENT_PUBKEY,
                    payer: payerKey,
                    subscription: subscriptionKey,
                    vaultTokenAccount: vaultTokenAccount,
                    payerTokenAccount: payerTokenAccount,
                    mint: mintKey,
                    payee: payeeKey,
                    payeeTokenAccount: payeeTokenAccount,
                    globalStats: globalStatsPDA,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: depositTokenProgramId,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                })
                .rpc();
            console.log(`\n🎉 Subscription Initialized Successfully!`);
            console.log(`Transaction Signature: ${tx}`);
            console.log(`New Subscription PDA: ${subscriptionKey.toBase58()}`);
            console.log(`Vault Token Account PDA: ${vaultTokenAccount.toBase58()}`);

            return subscriptionKey;

        } catch (error) {
            console.error("❌ Error initializing subscription:", error);
            return undefined;
        }
    }
    async function cancelSubscription(
        payerKey: web3.PublicKey,
        uniqueSeed: Buffer,
        mintAddress: PublicKey,
        vaultTokenAccount: PublicKey
    ): Promise<string | undefined> {

        const tokenProgramId = await getMintProgramId(mintAddress);

        const payerTokenAccount = getAssociatedTokenAddressSync(
            mintAddress,
            payerKey,
            false,
            tokenProgramId
        );

        const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("subscription"), // SUBSCRIPTION_SEED
                payerKey.toBuffer(),
                Buffer.from(uniqueSeed),      // The unique seed
            ],
            PROGRAM_ID
        );

        const globalStatsPDA = getGlobalStatsPDA(PROGRAM_ID);

        try {
            await program!.methods
                .cancelSubscription()
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionKey,
                    vaultTokenAccount: vaultTokenAccount,
                    payerTokenAccount: payerTokenAccount,
                    mint: mintAddress,
                    globalStats: globalStatsPDA,
                    tokenProgram: tokenProgramId,
                })
                .rpc();

            console.log(`\n✅ Subscription Cancelled!`);
        } catch (error) {
            console.error("❌ Error cancelling subscription:", error);
            // Log the full error message for debugging
            if (error instanceof Error) {
                console.error("Error Details:", error.message);
            }
            return undefined;
        }
    }


    async function createPlan(
        creatorKey: PublicKey,
        plan: Plan
    ): Promise<string | undefined> {
        if (!program) {
            console.error("Program not initialized");
            return undefined;
        }

        console.log("Creating Plan:", plan);

        // Format tiers correctly
        const formattedTiers = plan.tiers.map(tier => ({
            tierName: tier.tierName, // support both
            amount: new anchor.BN(tier.amount),
            periodSeconds: new anchor.BN(tier.periodSeconds),
            description: tier.description || "",
        }));

        // Derive Plan PDA
        const [planPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("plan"), creatorKey.toBytes()],
            program.programId
        );

        console.log(`Plan PDA: ${planPDA.toBase58()}`);
        const tokenProgramId = await getMintProgramId(new PublicKey(plan.token));
        const tokenMetadata = await fetchTokenMetadata(new PublicKey(plan.token))
        // Derive receiver's ATA (for Token-2022 + SPL)
        const receiverTokenAccount = getAssociatedTokenAddressSync(
            new PublicKey(plan.token),           // mint
            new PublicKey(plan.receiver),        // receiver wallet
            false,
            tokenProgramId                // or TOKEN_PROGRAM_ID — auto-detect if needed
        );

        try {
            const txSig = await program.methods
                .createPlan(
                    plan.name,                    // ← name: String
                    tokenMetadata.symbol,                       // ← token_symbol (hardcoded or from plan)
                    tokenMetadata.image,                           // ← token_image URL (optional)
                    formattedTiers                // ← Vec<SubscriptionTier>
                )
                .accounts({
                    creator: creatorKey,
                    plan: planPDA,
                    mint: new PublicKey(plan.token),
                    receiver: new PublicKey(plan.receiver),
                    receiverTokenAccount: receiverTokenAccount,
                    tokenProgram: tokenProgramId, // or detect based on mint
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log("Plan Created Successfully!");
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            console.log("Plan PDA:", planPDA.toBase58());

            return txSig;
        } catch (error: any) {
            console.error("Failed to create plan:", error);
            console.error("Logs:", error.logs?.join("\n"));
            return undefined;
        }
    }

    return { fetchUserSubscriptions, initializeSubscription, cancelSubscription, fetchAllSubscriptionPlans, createPlan, cancelPlan }
}




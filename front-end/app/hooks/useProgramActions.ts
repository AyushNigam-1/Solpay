import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import Cookies from "js-cookie"
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { fetchTokenMetadata, generateUniqueSeed, getMintProgramId } from "../utils/token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Plan, planQuery, Plans, Subscription, SubscriptionTier } from "../types";
// import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

const ACTIVE_STATUS_OFFSET = 225;

export const useProgramActions = () => {
    const { program, getGlobalStatsPDA, PROGRAM_ID } = useProgram()

    async function fetchAllSubscriptionPlans(): Promise<planQuery[]> {
        try {
            console.log(program!.account as any)
            // Fetch ALL plan accounts using .all() with no filter
            const plans = await (program!.account as any).planAccount.all();
            console.log(plans)
            // const plan = await getPlan(plans[0].publicKey)
            // console.log("plan", plan)
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

    async function fetchUserSubscriptions() {
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
            if (subscriptions.length === 0) {
                console.log("✅ No active or inactive subscriptions found for this user.");
                return;
            }
            for (const { account } of subscriptions) {
                const planMetaData = await getPlan(new PublicKey(account.planPda))
                account.planMetaData = planMetaData?.data
            }
            console.log(subscriptions, "subs")
            return subscriptions
        } catch (error) {
            console.error("❌ Error fetching subscriptions:", error);
            return []
        }
    }


    async function initializeSubscription(
        tier: String,                    // ← Plan PDA (not name)
        plan: PublicKey,                      // ← "Premium", "Basic"
        payerKey: PublicKey,
        duration: number,
        mintKey: PublicKey,
        periodSeconds: number | string,
        prefundingAmount: number | string = "0",
        autoRenew: boolean = true,
    ): Promise<PublicKey | undefined> {
        if (!program || !payerKey) {
            alert("Wallet or program not connected");
            return undefined;
        }

        try {
            const depositTokenProgramId = await getMintProgramId(mintKey);
            const prefundBN = new anchor.BN(prefundingAmount);
            const uniqueSeed = crypto.getRandomValues(new Uint8Array(8));

            const [subscriptionPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("subscription"),
                    payerKey.toBytes(),
                    Buffer.from(uniqueSeed),
                ],
                PROGRAM_ID
            );

            const [vaultPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), subscriptionPDA.toBytes()],
                PROGRAM_ID
            );

            const payerATA = getAssociatedTokenAddressSync(
                mintKey,
                payerKey,
                false,
                depositTokenProgramId
            );

            // Calculate next payment (now + period)
            const now = Math.floor(Date.now() / 1000);
            const nextPaymentTs = now + Number(periodSeconds);

            const txSig = await program.methods
                .initializeSubscription(
                    tier,                    // ← tier string
                    plan.toBase58(),                     // ← plan PDA
                    autoRenew,
                    prefundBN,
                    new anchor.BN(nextPaymentTs),
                    new anchor.BN(duration),
                    Array.from(uniqueSeed)       // ← [u8; 8] as number[]
                )
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                    vaultTokenAccount: vaultPDA,
                    payerTokenAccount: payerATA,
                    mint: mintKey,
                    globalStats: getGlobalStatsPDA(PROGRAM_ID),
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: depositTokenProgramId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log("Subscription Created!");
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            console.log("Subscription PDA:", subscriptionPDA.toBase58());

            return subscriptionPDA;
        } catch (error: any) {
            console.error("Failed to create subscription:", error);
            alert("Error: " + (error.message || "Unknown error"));
            return undefined;
        }
    }

    /**
     * Update either auto_renew or active status of a subscription
     */
    async function updateSubscriptionStatus(
        subscriptionPDA: PublicKey,
        field: "autoRenew" | "active",
        value: boolean,
        payerKey: PublicKey
    ): Promise<string | undefined> {
        if (!program || !payerKey) {
            alert("Wallet or program not connected");
            return undefined;
        }

        try {
            // Map string to enum variant
            const fieldEnum = field === "autoRenew"
                ? { autoRenew: {} }
                : { active: {} };

            const txSig = await program.methods
                .updateSubscriptionStatus(fieldEnum, value)
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                })
                .rpc();

            console.log(`${field} updated to ${value}`);
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            return txSig;
        } catch (error: any) {
            console.error("Failed to update status:", error);

            if (error.message.includes("Unauthorized")) {
                alert("Only the subscription owner can update this");
            } else {
                alert("Update failed: " + (error.message || "Unknown error"));
            }
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

    async function withdrawRemaining(
        subscriptionPDA: PublicKey,
        payerKey: PublicKey // wallet.publicKey
    ): Promise<string | undefined> {
        if (!program || !payerKey) {
            alert("Wallet or program not connected");
            return undefined;
        }

        try {
            // 1. Fetch subscription account to get mint + bump
            const subscription = await (program.account as any).subscription.fetch(subscriptionPDA);

            // 2. Derive vault PDA (same seeds as in program)
            const [vaultPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("vault"),
                    subscriptionPDA.toBuffer(),
                ],
                PROGRAM_ID
            );

            // 3. Derive payer's ATA for the mint
            const payerTokenAccount = getAssociatedTokenAddressSync(
                subscription.mint,
                payerKey,
                false,
                TOKEN_2022_PROGRAM_ID // or detect if it's Token-2022
            );

            // 4. Build and send transaction
            const txSig = await program.methods
                .withdrawRemaining()
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                    vaultTokenAccount: vaultPDA,
                    payerTokenAccount,
                    mint: subscription.mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .rpc();

            console.log("Remaining funds withdrawn!");
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // Optional: refresh UI
            // await refetchSubscriptions();

            return txSig;
        } catch (error: any) {
            console.error("Failed to withdraw remaining funds:", error);

            // Common user-friendly errors
            if (error.message.includes("SubscriptionActive")) {
                alert("Cannot withdraw — subscription is still active!");
            } else if (error.message.includes("Unauthorized")) {
                alert("Only the original payer can withdraw funds.");
            } else {
                alert("Withdraw failed: " + (error.message || "Unknown error"));
            }

            return undefined;
        }
    }

    async function manageVault(
        subscriptionPDA: PublicKey,
        action: "fund" | "withdraw",
        amount: number | string, // raw amount (e.g. 50000000 for 50 USDC)
        payerKey: PublicKey
    ): Promise<string | undefined> {
        if (!program || !payerKey) {
            alert("Wallet or program not connected");
            return undefined;
        }
        console.log(subscriptionPDA)
        try {
            // Fetch subscription to get mint
            const subscription = await (program.account as any).subscription.fetch(subscriptionPDA);
            console.log(subscription)
            // // Derive vault PDA
            const [vaultPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("vault"),
                    subscriptionPDA.toBuffer(),
                ],
                PROGRAM_ID
            );

            // Payer's ATA
            const payerATA = getAssociatedTokenAddressSync(
                subscription.mint,
                payerKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            // Convert amount to BN
            const amountBN = new anchor.BN(amount);

            // Build transaction
            const txSig = await program.methods
                .manageVault(
                    action === "fund" ? { fund: {} } : { withdraw: {} },
                    amountBN
                )
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                    vaultTokenAccount: vaultPDA,
                    payerTokenAccount: payerATA,
                    mint: subscription.mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .rpc();

            console.log(`Vault ${action}ed successfully!`);
            // console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // return txSig;
        } catch (error: any) {
            console.error(`Failed to ${action} vault:`, error);

            if (error.message.includes("InsufficientVaultBalance")) {
                alert("Not enough tokens in vault to withdraw");
            } else if (error.message.includes("ZeroAmount")) {
                alert("Amount must be greater than 0");
            } else {
                alert(`Error: ${error.message || "Transaction failed"}`);
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
            PROGRAM_ID
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
                    systemProgram: web3.SystemProgram.programId,
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
    async function getPlan(planPDA: PublicKey) {
        console.log(planPDA)
        // return null
        if (!program) {
            console.error("Program not initialized");
            return null;
        }

        try {
            const planAccount = await (program.account as any).planAccount.fetch(planPDA);

            console.log("Plan fetched successfully!");
            console.log("Name:", planAccount.name);
            console.log("Creator:", planAccount.creator.toBase58());
            console.log("Tiers:", planAccount.tiers.length);

            return {
                pda: planPDA,
                data: planAccount,
            };
        } catch (error: any) {
            console.log("plan fetching error", error)
            if (error.message.includes("Account does not exist")) {
                console.log("No plan found at this PDA:", planPDA.toBase58());
            } else {
                console.error("Error fetching plan:", error);
            }
            return null;
        }
    }
    return { fetchUserSubscriptions, initializeSubscription, cancelSubscription, fetchAllSubscriptionPlans, createPlan, cancelPlan, getPlan, manageVault, updateSubscriptionStatus }
}




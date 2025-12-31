import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import { approveSubscriptionSpending, fetchTokenMetadata } from "../utils/token";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Plan, planQuery } from "../types";
import { formatPeriod } from "../utils/duration";
import { compressData, decompressData } from "../utils/compression";
import { useWallet } from "@solana/wallet-adapter-react";

export const useProgramActions = () => {
    const wallet = useWallet();
    const { program, getGlobalStatsPDA, PROGRAM_ID, connection, provider } = useProgram()

    async function getEventsFromSignature(
        txSignature: string,
        eventName: string
    ): Promise<any | null> {
        // 1. Fetch the confirmed transaction details
        const txResponse = await connection.getTransaction(txSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
        });
        if (!txResponse || !txResponse.meta?.logMessages) {
            console.error("Failed to fetch transaction or logs.");
            return null;
        }

        const eventParser = new anchor.EventParser(program!.programId, new anchor.BorshCoder(program!.idl));
        const decodedEvents = eventParser.parseLogs(txResponse.meta.logMessages);

        const initializeEvent = decodedEvents.find((e: any) => e.name === eventName);
        if (initializeEvent) {
            return initializeEvent.data;
        }
        console.warn("InitializeEvent not found in transaction logs.");
        return null;
    }

    async function fetchAllSubscriptionPlans(): Promise<planQuery[]> {
        try {
            let plans = await (program!.account as any).plan.all();
            plans = plans.map((plan: any) => ({ publicKey: plan.publicKey, account: { ...plan.account, tiers: decompressData(plan.account.tiers) } }))
            console.log(plans)
            return plans
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
        console.log("fetching")
        try {
            const subscriptions = await (program!.account as any).subscription.all();
            console.log("subscriptions", subscriptions)
            if (subscriptions.length === 0) {
                console.log("✅ No active or inactive subscriptions found for this user.");
                return;
            }
            for (const { account } of subscriptions) {
                const planMetadata = await getPlan(new PublicKey(account.planPda))
                account.planMetadata = planMetadata?.data
            }
            console.log(subscriptions, "subs")
            return subscriptions
        } catch (error) {
            console.error("❌ Error fetching subscriptions:", error);
            return []
        }
    }

    async function initializeSubscription(
        tierName: string,
        planPda: PublicKey,
        payerKey: PublicKey,
        periodSeconds: number | string,
        amount: number | string,
        autoRenew: boolean = true,
        receiver: PublicKey,
        mint: PublicKey,
    ) {
        if (!program || !payerKey) {
            alert("Wallet or program not connected");
            return undefined;
        }

        try {
            // 1. generate unique seed
            const uniqueSeed = crypto.getRandomValues(new Uint8Array(8));

            // 2. derive subscription PDA
            const [subscriptionPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("subscription"),
                    payerKey.toBytes(),
                    Buffer.from(uniqueSeed),
                ],
                PROGRAM_ID
            );

            // 3. create subscription on-chain
            const txSig = await program.methods
                .initializeSubscription(
                    tierName,
                    planPda,
                    new anchor.BN(periodSeconds),
                    new anchor.BN(amount),
                    autoRenew,
                    Array.from(uniqueSeed)
                )
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                    globalStats: getGlobalStatsPDA(PROGRAM_ID),
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            // 4. approve delegate spending ONLY if auto-renew
            if (autoRenew) {

                await approveSubscriptionSpending({
                    connection,
                    wallet: wallet!,
                    mint,
                    subscriptionPDA,
                    allowanceAmount: BigInt("18446744073709551615"), // explained below
                });

            }
            const account = await getEventsFromSignature(
                txSig,
                "subscriptionInitialized"
            );
            return {
                subscriptionPDA: subscriptionPDA.toBase58(),
                account,
            };
        } catch (error: any) {
            console.error("Failed to create subscription:", error);
            return undefined;
        }
    }


    /**
     * Update either auto_renew or active status of a subscription
     */
    // import * as anchor from "@coral-xyz/anchor";
    // import { PublicKey } from "@solana/web3.js";

    // // Assuming these are globally defined or imported
    // declare const program: anchor.Program;
    // declare const connection: any;

    // Define the input type for the field
    type UpdateField = "autoRenew" | "active" | "duration" | "tier";

    // /**
    //  * Updates a specific field of the subscription.
    //  * @param subscriptionPDA The public key of the subscription account.
    //  * @param field The field to update: "autoRenew", "active", or "duration".
    //  * @param value The new value. Boolean for autoRenew/active, number (seconds) for duration.
    //  * @param payerKey The public key of the payer (must be the subscription owner).
    //  */
    async function updateSubscription(
        subscriptionPDA: PublicKey,
        field: UpdateField,
        value: boolean | number | string,
        payerKey: PublicKey
    ) {
        if (!program || !payerKey) {
            console.error("Wallet or program not connected");
            return undefined;
        }

        try {
            let fieldEnum: any;
            let valueEnum: any; // Correct type for UpdateValue enum
            console.log(formatPeriod(value.toString()))
            // 1. Map string field to IDL Enum variants
            switch (field) {
                case "autoRenew":
                    fieldEnum = { autoRenew: {} } as const;
                    valueEnum = { bool: [value as boolean] };
                    break;

                case "active":
                    fieldEnum = { active: {} } as const;
                    valueEnum = { bool: [value as boolean] };
                    break;

                case "tier":
                    fieldEnum = { tier: {} } as const;
                    valueEnum = { string: [value as string] };
                    break;

                default:
                    throw new Error(`Invalid field: ${field}`);
            }

            console.log(`Updating ${field} to ${value}`);
            console.log("Field Enum:", JSON.stringify(fieldEnum));
            console.log("Value Enum:", JSON.stringify(valueEnum));

            // 2. Call the instruction
            // Rust signature: update_subscription_status(ctx, field: SubscriptionField, value: UpdateValue)
            // Ensure method name matches IDL (usually camelCase: updateSubscriptionStatus)
            const txSig = await program.methods
                .updateSubscriptionStatus(fieldEnum, valueEnum)
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionPDA,
                    // System program might be inferred
                })
                .rpc();

            console.log(`${field} updated successfully!`);
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            return txSig;

        } catch (error: any) {
            console.error("Failed to update status:", error);

            // Enhance error reporting
            if (error.message && error.message.includes("Unauthorized")) {
                alert("Only the subscription owner can update this.");
            } else if (error.message && error.message.includes("unable to infer src variant")) {
                alert("Serialization Error: Enum variant mismatch. Check console logs for payload.");
            } else {
                alert(`Update failed: ${error.message || "Unknown error"}`);
            }
            return undefined;
        }
    }


    async function cancelSubscription(
        payerKey: web3.PublicKey,
        uniqueSeed: Buffer,
    ) {

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
            const txSig = await program!.methods
                .cancelSubscription()
                .accounts({
                    payer: payerKey,
                    subscription: subscriptionKey,
                    globalStats: globalStatsPDA,
                })
                .rpc();
            const account = await getEventsFromSignature(txSig, "subscriptionCancelled");
            if (!account) {
                console.warn("Event data not found in confirmed transaction. Check program logs.");
            }
            console.log(`\n✅ Subscription Cancelled!`);
            return { subscriptionPDA: account.subscription };
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

        // Compress tier data
        const compressedTiers = compressData(plan.tiers);

        if (compressedTiers.length > 1000) {
            throw new Error("Compressed tier data exceeds on-chain limit");
        }
        const tokenMetadata = await fetchTokenMetadata(new PublicKey(plan.token))

        const [planPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("plan"),
                creatorKey.toBytes(),
            ],
            PROGRAM_ID
        );

        try {
            const txSig = await program.methods
                .createPlan(
                    plan.name,
                    tokenMetadata.symbol,
                    tokenMetadata.image,
                    Buffer.from(compressedTiers)
                )
                .accounts({
                    creator: creatorKey,
                    plan: planPDA,
                    mint: new PublicKey(plan.token),
                    receiver: new PublicKey(plan.receiver),
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
            return txSig
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
            let planAccount = await (program.account as any).plan.fetch(planPDA);
            planAccount = { ...planAccount, tiers: decompressData(planAccount.tiers) }
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


    return { fetchUserSubscriptions, initializeSubscription, cancelSubscription, fetchAllSubscriptionPlans, createPlan, cancelPlan, getPlan, updateSubscription }
}




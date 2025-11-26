import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import Cookies from "js-cookie"
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Subscription } from "../types";
import { generateUniqueSeed, getMintProgramId } from "../utils/token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const ACTIVE_STATUS_OFFSET = 225;

export const useProgramActions = () => {
    const { program, getGlobalStatsPDA, PROGRAM_ID } = useProgram()

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
            const subscriptions = await (program!.account as any).subscription.all(filters);
            console.log(subscriptions, "subs")
            // if (subscriptions.length === 0) {
            //     console.log("✅ No active or inactive subscriptions found for this user.");
            //     return;
            // }
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
        payerKey: web3.PublicKey,
        payeeKey: web3.PublicKey,
        mintKey: web3.PublicKey,
        amount: number | string,
        periodSeconds: number | string,
        firstPaymentTs: number | string,
        prefundingAmount: number | string,
        autoRenew: boolean,

    ): Promise<web3.PublicKey | undefined> {
        console.log(payeeKey, payerKey, mintKey, amount, periodSeconds, firstPaymentTs, autoRenew)
        // Convert numerical inputs to Anchor's Big Number (BN)
        const amountBN = new anchor.BN(amount);
        const periodSecondsBN = new anchor.BN(periodSeconds);
        const firstPaymentTsBN = new anchor.BN(firstPaymentTs);
        const prefundingAmountBN = new anchor.BN(prefundingAmount); // NEW BN conversion
        const depositTokenProgramId = await getMintProgramId(mintKey);
        const uniqueSeed = generateUniqueSeed();

        const [subscriptionKey, subscriptionBump] = web3.PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("subscription"), // Your custom seed string
                payerKey.toBuffer(),
                Buffer.from(uniqueSeed)  // ← MUST INCLUDE THIS
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
        try {
            const tx = await program!.methods
                .initializeSubscription(
                    amountBN,
                    periodSecondsBN,
                    firstPaymentTsBN,
                    autoRenew,
                    prefundingAmountBN,
                    uniqueSeed.toJSON().data
                )
                .accounts({
                    subscription: subscriptionKey,
                    payer: payerKey,
                    payee: payeeKey,
                    mint: mintKey,
                    globalStats: globalStatsPDA,
                    payerTokenAccount: payerTokenAccount,
                    payeeTokenAccount: payeeTokenAccount,
                    vaultTokenAccount: vaultTokenAccount,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: depositTokenProgramId,
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
    return { fetchUserSubscriptions, initializeSubscription }
}




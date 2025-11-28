import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import Cookies from "js-cookie"
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { fetchTokenMetadata, generateUniqueSeed, getMintProgramId } from "../utils/token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Subscription } from "../types";

const ACTIVE_STATUS_OFFSET = 225;

export const useProgramActions = () => {
    const { program, getGlobalStatsPDA, PROGRAM_ID } = useProgram()

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
        try {
            const tx = await program!.methods
                .initializeSubscription(
                    name,
                    amountBN,
                    periodSecondsBN,
                    firstPaymentTsBN,
                    autoRenew,
                    prefundingAmountBN,
                    [...uniqueSeed],
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
            const tx = await program!.methods
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
    return { fetchUserSubscriptions, initializeSubscription, cancelSubscription }
}




import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import Cookies from "js-cookie"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
export interface Subscription {
    payer: web3.PublicKey;
    payee: web3.PublicKey;
    mint: web3.PublicKey;
    amount: anchor.BN;
    periodSeconds: anchor.BN;
    nextPaymentTs: anchor.BN;
    active: boolean;
    autoRenew: boolean;
    vaultTokenAccount: web3.PublicKey;
    bump: number;
}

const ACTIVE_STATUS_OFFSET = 128;

export const useActions = () => {
    const { program } = useProgram()

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
                    bytes: 'AQ',
                },
            },
        ];

        try {
            const subscriptions: anchor.ProgramAccount<Subscription>[] = await (program!.account as any).subscription.all(filters);
            if (subscriptions.length === 0) {
                console.log("✅ No active or inactive subscriptions found for this user.");
                return;
            }
            console.log(subscriptions)
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
        }
    }

    async function initializeSubscription(
        payerKey: web3.PublicKey,
        payeeKey: web3.PublicKey,
        mintKey: web3.PublicKey,
        globalStatsKey: web3.PublicKey,
        amount: number | string,
        periodSeconds: number | string,
        firstPaymentTs: number | string,
        autoRenew: boolean,
    ): Promise<web3.PublicKey | undefined> {

        // Convert numerical inputs to Anchor's Big Number (BN)
        const amountBN = new anchor.BN(amount);
        const periodSecondsBN = new anchor.BN(periodSeconds);
        const firstPaymentTsBN = new anchor.BN(firstPaymentTs);

        const [subscriptionKey, subscriptionBump] = web3.PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("subscription"), // Your custom seed string
                payerKey.toBuffer(),
                payeeKey.toBuffer(),
                mintKey.toBuffer(),
            ],
            program!.programId
        );

        const [vaultTokenAccount, vaultBump] = web3.PublicKey.findProgramAddressSync(
            [
                subscriptionKey.toBuffer(), // Seed the vault with the Subscription PDA itself
                TOKEN_PROGRAM_ID.toBuffer(),
                mintKey.toBuffer(),
            ],
            program!.programId
        );

        try {
            const tx = await program!.methods
                .initializeSubscription(
                    amountBN,
                    periodSecondsBN,
                    firstPaymentTsBN,
                    autoRenew,
                )
                .accounts({
                    subscription: subscriptionKey,
                    payer: payerKey,
                    payee: payeeKey,
                    mint: mintKey,
                    globalStats: globalStatsKey,
                    vaultTokenAccount: vaultTokenAccount,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
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




import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { queueTask, compileTransaction } from "@helium/tuktuk-sdk";
import tuktukIdl from "../tuktuk.json";
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const TUKTUK_TASK_QUEUE_PUBKEY = new PublicKey(
    "8aNVo2fpoY3XPq2b1MbuC3xVArRLcn7w2Yue8vEPYgu6"
);

/* ---------- program factory ---------- */

function getTuktukProgram(provider: AnchorProvider) {
    return new Program(
        tuktukIdl as Idl,
        provider
    );
}

/* ---------- scheduler ---------- */

export async function scheduleWithTukTuk(
    provider: AnchorProvider,
    executePaymentIx: any,
    executeAtTs: number
): Promise<{
    scheduled: boolean;
    txSig?: string;
    executeAtTs?: number;
}> {
    try {
        if (!provider) {
            throw new Error("Anchor provider is undefined");
        }

        console.log("🕒 Scheduling payment at unix ts:", executeAtTs);

        // 1️⃣ Get TukTuk program
        const tuktuk = getTuktukProgram(provider);

        // 2️⃣ Compile transaction
        console.log("⚙️ Compiling executePayment instruction…");

        const { transaction } = compileTransaction(
            [executePaymentIx],
            []
        );

        if (!transaction) {
            throw new Error("Failed to compile transaction for TukTuk");
        }

        console.log("✅ Transaction compiled");

        // 3️⃣ Queue task
        console.log("📥 Queuing task in TukTuk…");
        console.log("Task Queue:", TUKTUK_TASK_QUEUE_PUBKEY.toBase58());

        const txBuilder = await queueTask(tuktuk, {
            taskQueue: TUKTUK_TASK_QUEUE_PUBKEY,
            args: {
                trigger: {
                    timestamp: {
                        unixTimestamp: executeAtTs,
                    },
                },
                transaction: {
                    compiledV0: [transaction],
                },
                description: "Subscription payment",
            },
        });

        // 4️⃣ Send transaction
        const txSig = await txBuilder.rpc();

        console.log("🎉 Task successfully scheduled!");
        console.log("TukTuk TX:", txSig);

        return {
            scheduled: true,
            txSig,
            executeAtTs,
        };

    } catch (err: any) {
        console.error("❌ Failed to schedule task with TukTuk");

        // Anchor-style error logs
        if (err?.logs) {
            console.error("📜 Program logs:");
            err.logs.forEach((l: string) => console.error(l));
        }

        console.error("Error message:", err?.message || err);

        return {
            scheduled: false,
        };
    }
}


export async function buildExecutePaymentIx(
    program: Program,
    subscriptionPDA: PublicKey,
    planPDA: PublicKey,
    userTokenAccount: PublicKey,        // 👈 payer’s token account
    receiverTokenAccount: PublicKey,    // 👈 merchant
    mint: PublicKey,
) {
    return program.methods
        .executePayment()
        .accounts({
            subscription: subscriptionPDA,
            plan: planPDA,
            userTokenAccount,               // 👈 renamed
            receiverTokenAccount,
            mint,
            tokenProgram: TOKEN_PROGRAM_ID, // token-interface compatible
            clock: SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(); // 👈 MUST be instruction(), not rpc()
}


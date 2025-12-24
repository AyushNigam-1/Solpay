import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { queueTask, compileTransaction } from "@helium/tuktuk-sdk";
import tuktukIdl from "../tuktuk.json";
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

/* ---------- constants ---------- */

const TUKTUK_PROGRAM_ID = new PublicKey(
    "tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA"
);

const TUKTUK_TASK_QUEUE_PUBKEY = new PublicKey(
    "PUT_YOUR_TASK_QUEUE_PUBKEY_HERE"
);

/* ---------- program factory ---------- */

function getTuktukProgram(provider: AnchorProvider) {
    return new Program(
        tuktukIdl as Idl,
        provider
    );
}

/* ---------- scheduler ---------- */

async function scheduleWithTukTuk(
    provider: AnchorProvider,
    executePaymentIx: any,
    executeAtTs: number
) {
    const tuktuk = getTuktukProgram(provider);

    const { transaction } = compileTransaction(
        [executePaymentIx],
        []
    );

    await (
        await queueTask(tuktuk, {
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
        })
    ).rpc();
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


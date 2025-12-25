import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../tuktuk.json";

const provider = AnchorProvider.env();
const program = new Program(idl as any, provider);

const TUKTUK_PROGRAM_ID = new PublicKey(
    "tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA"
);

// ✅ existing task queue PDA
const TASK_QUEUE = new PublicKey(
    "8aNVo2fpoY3XPq2b1MbuC3xVArRLcn7w2Yue8vEPYgu6"
);

// ✅ wallet/program you want to authorize
const QUEUE_AUTHORITY = new PublicKey(
    "FUk2WGh5Kcxk8sRm6V9jRYgWiQML7X8DPTKaK9Eqc1ry"
);

async function main() {
    // 🔑 derive task_queue_authority PDA EXACTLY like Rust
    const [taskQueueAuthorityPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("task_queue_authority"),
            TASK_QUEUE.toBuffer(),
            QUEUE_AUTHORITY.toBuffer(),
        ],
        TUKTUK_PROGRAM_ID
    );

    await program.methods
        .addQueueAuthorityV0()
        .accounts({
            payer: provider.wallet.publicKey,
            updateAuthority: provider.wallet.publicKey, // must match has_one
            queueAuthority: QUEUE_AUTHORITY,
            taskQueueAuthority: taskQueueAuthorityPDA,
            taskQueue: TASK_QUEUE,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log("✅ Queue authority added");
    console.log("Authority PDA:", taskQueueAuthorityPDA.toBase58());
}

main().catch(console.error);

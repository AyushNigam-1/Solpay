import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import idl from "../tuktuk.json";

const provider = AnchorProvider.env();
const TUKTUK_PROGRAM_ID = new PublicKey(
    "tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA"
);

const program = new Program(idl as any, provider);
const TASK_QUEUE_NAME = "my-subscriptions-2025";

async function initializeTaskQueue() {
    // tuktuk_config PDA
    const [tuktukConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("tuktuk_config")],
        TUKTUK_PROGRAM_ID
    );

    const config = await (program.account as any).tuktukConfigV0.fetch(
        tuktukConfigPDA
    );

    const queueId = config.nextTaskQueueId;
    const idBuf = Buffer.alloc(4);
    idBuf.writeUInt32LE(queueId, 0);

    const [taskQueuePDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("task_queue"),
            tuktukConfigPDA.toBuffer(),
            idBuf,
        ],
        TUKTUK_PROGRAM_ID
    );

    // ✅ CORRECT name mapping PDA
    const nameHash = Buffer.from(sha256(Buffer.from(TASK_QUEUE_NAME)));
    const [taskQueueNameMappingPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("task_queue_name_mapping"),
            tuktukConfigPDA.toBuffer(),
            nameHash,
        ],
        TUKTUK_PROGRAM_ID
    );

    console.log("Config PDA:", tuktukConfigPDA.toBase58());
    console.log("Task Queue PDA:", taskQueuePDA.toBase58());
    console.log("Name Mapping PDA:", taskQueueNameMappingPDA.toBase58());

    const tx = await program.methods
        .initializeTaskQueueV0({
            minCrankReward: new BN(5000),
            name: TASK_QUEUE_NAME,
            capacity: 1000,
            lookupTables: [],
            staleTaskAge: 60 * 60 * 24 * 7,
        })
        .accounts({
            payer: provider.wallet.publicKey,
            updateAuthority: provider.wallet.publicKey,
            tuktukConfig: tuktukConfigPDA,
            taskQueue: taskQueuePDA,
            taskQueueNameMapping: taskQueueNameMappingPDA,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log("✅ Task queue created");
    console.log("TX:", tx);
}

initializeTaskQueue().catch(console.error);

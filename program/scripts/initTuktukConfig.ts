import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import idl from "../tuktuk.json";

const provider = AnchorProvider.env();
const program = new Program(idl as any, provider);

async function main() {
    await program.methods
        .initializeTuktukConfigV0({
            authority: provider.wallet.publicKey,
        })
        .accounts({
            authority: provider.wallet.publicKey, // 👈 REQUIRED
            systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

    console.log("TukTuk config initialized");
}

main().catch(console.error);

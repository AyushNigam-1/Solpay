import { ASSOCIATED_TOKEN_PROGRAM_ID, createApproveInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, getTokenMetadata, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import axios from "axios";
import { FullTokenMetadata, UserTokenAccount } from "../types";
import type { WalletContextState } from "@solana/wallet-adapter-react";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export const getMintProgramId = async (mint: PublicKey): Promise<PublicKey> => {
    try {
        const mintAccountInfo = await connection.getAccountInfo(mint);

        if (!mintAccountInfo) {
            console.warn("Mint account not found. Defaulting to standard SPL Token Program ID.");
            return TOKEN_PROGRAM_ID;
        }
        if (mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            console.log(`Mint ${mint.toBase58()} is owned by Token-2022.`);
            return TOKEN_2022_PROGRAM_ID;
        }
        console.log(`Mint ${mint.toBase58()} is owned by standard SPL Token.`);
        return TOKEN_PROGRAM_ID;

    } catch (e) {
        console.error("Failed to fetch mint account info, defaulting to standard SPL Token Program ID:", e);
        return TOKEN_PROGRAM_ID;
    }
};

// export const generateUniqueSeed = (): Buffer => {
//     // window.crypto.getRandomValues generates secure random numbers for the Uint8Array
//     const buffer = new Uint8Array(8);
//     if (typeof window !== 'undefined' && window.crypto) {
//         window.crypto.getRandomValues(buffer);
//     } else {
//         console.warn("Using insecure fallback for random seed generation. Ensure window.crypto is available.");
//         for (let i = 0; i < 8; i++) {
//             buffer[i] = Math.floor(Math.random() * 256);
//         }
//     }
//     // Convert the Uint8Array to a Buffer, which is what PDA calculations prefer
//     return Buffer.from(buffer);
// };
export function generateUniqueSeed(): Buffer {
    const arr = new Uint8Array(8);
    window.crypto.getRandomValues(arr);
    return Buffer.from(arr);
}

export async function fetchTokenMetadata(
    mintAddress: PublicKey,
): Promise<FullTokenMetadata> {
    const programId = await getMintProgramId(mintAddress);
    const onChainMetadata = await getTokenMetadata(
        connection,
        mintAddress,
        "confirmed",
        programId
    );

    if (!onChainMetadata) {
        throw new Error(`Metadata not found for mint: ${mintAddress.toBase58()}`);
    }

    try {
        const { data: offChainData } = await axios(onChainMetadata.uri);
        return {
            name: onChainMetadata.name,
            symbol: onChainMetadata.symbol,
            uri: onChainMetadata.uri,
            description: offChainData.description || "",
            image: offChainData.image || "", // Use a placeholder if image is missing
            mintAddress: mintAddress.toBase58(),
        };
    } catch (e) {
        console.warn(`Could not fetch or parse off-chain metadata from URI: ${onChainMetadata.uri}. Falling back to on-chain data. Error:`, e);
        throw e;
    }
    // 3. Combine and return
}

export async function fetchUserTokenAccounts(
    owner: PublicKey,
): Promise<UserTokenAccount[]> {

    // Use getParsedTokenAccountsByOwner for cleaner data, supporting both programs
    const [token2022Accounts, legacyTokenAccounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    ]);

    const rawAccounts = [...token2022Accounts.value, ...legacyTokenAccounts.value];
    console.log("rawAccounts", rawAccounts)
    const userAccounts: UserTokenAccount[] = [];
    for (const { pubkey, account } of rawAccounts) {
        const info = account.data.parsed.info;
        try {
            const metadata = await fetchTokenMetadata(new PublicKey(info.mint))
            const uiAmount = info.tokenAmount.uiAmount;
            const amount = info.tokenAmount.amount;
            const decimals = info.tokenAmount.decimals;
            console.log("mint", info.mint, info.owner, uiAmount)
            if (info.mint && info.owner) {
                userAccounts.push({
                    tokenAddress: String(pubkey),
                    mint: info.mint,
                    amount: parseInt(amount, 10),
                    uiAmount,
                    decimals,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    description: metadata.description || "",
                    image: metadata.image || "" // Use a placeholder if image is missing
                });
            }
        }
        catch (err) {
            throw err
        }
    }
    console.log("inside fetch acc", userAccounts)
    return userAccounts;
}


// import {
//   getAssociatedTokenAddress,
//   createAssociatedTokenAccountInstruction,
//   createApproveInstruction,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";

export async function approveSubscriptionSpending({
    connection,
    wallet,
    mint,
    subscriptionPDA,
    allowanceAmount,
}: {
    connection: Connection;
    wallet: WalletContextState;
    mint: PublicKey;
    subscriptionPDA: PublicKey;
    allowanceAmount: bigint;
}) {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected or cannot sign");
    }

    try {
        // 🔑 detect correct token program (SPL or Token-2022)
        const tokenProgramId = await getMintProgramId(mint);

        const userTokenAccount = await getAssociatedTokenAddress(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const instructions = [];

        const ataInfo = await connection.getAccountInfo(userTokenAccount);

        if (!ataInfo) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    userTokenAccount,
                    wallet.publicKey,
                    mint,
                    tokenProgramId,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }

        instructions.push(
            createApproveInstruction(
                userTokenAccount,
                subscriptionPDA,      // delegate
                wallet.publicKey,
                allowanceAmount,
                [],
                tokenProgramId        // ✅ THIS fixes your error
            )
        );

        const tx = new Transaction().add(...instructions);
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signed = await wallet.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        return { txSig: sig, userTokenAccount };
    } catch (err: any) {
        console.error("approveSubscriptionSpending error:", err);
        throw new Error(err?.message || "Failed to approve subscription spending");
    }
}



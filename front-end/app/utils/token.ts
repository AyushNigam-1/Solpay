import { ASSOCIATED_TOKEN_PROGRAM_ID, createApproveInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, getTokenMetadata, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
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

export const truncateAddress = (addr: string | PublicKey) => {
    if (!addr) return "Unknown";
    return `${addr.toString().slice(0, 4)}...${addr.toString().slice(-4)}`;
}
// import {
//   getAssociatedTokenAddress,
//   createAssociatedTokenAccountInstruction,
//   createApproveInstruction,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";

export async function getApproveInstructions({
    connection,
    payerKey,
    mint,
    subscriptionPDA,
    allowanceAmount,
}: {
    connection: Connection;
    payerKey: PublicKey;
    mint: PublicKey;
    subscriptionPDA: PublicKey;
    allowanceAmount: bigint;
}): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    try {
        // 1. Detect correct token program
        const tokenProgramId = await getMintProgramId(mint);

        // 2. Get ATA
        const userTokenAccount = await getAssociatedTokenAddress(
            mint,
            payerKey,
            false,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // 3. Check if ATA exists (Safety check, though likely true for a subscriber)
        const ataInfo = await connection.getAccountInfo(userTokenAccount);
        if (!ataInfo) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    payerKey,
                    userTokenAccount,
                    payerKey,
                    mint,
                    tokenProgramId,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }

        // 4. Create the Approve Instruction
        instructions.push(
            createApproveInstruction(
                userTokenAccount,
                subscriptionPDA,      // Delegate (The subscription contract)
                payerKey,             // Owner
                allowanceAmount,
                [],
                tokenProgramId        // Correct Program ID
            )
        );

        return instructions;
    } catch (err: any) {
        console.error("Error creating approve instructions:", err);
        throw new Error("Failed to generate approval instructions");
    }
}



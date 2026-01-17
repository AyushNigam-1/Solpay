import { web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js";
import { LucideIcon } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

// export interface Plans {
//     publicKey: web3.PublicKey;
//     account: {
//         provider: web3.PublicKey;
//         mint: web3.PublicKey;
//         amount: bigint;
//         periodSeconds: bigint;
//         name: string;
//         bump: number;
//     };
// }

export interface Subscription {
    name: string;
    payer: web3.PublicKey;
    payee: web3.PublicKey;
    mint: web3.PublicKey;
    tierName: string,
    planPda: string,
    planName?: string,
    amount: number,
    nextPaymentTs: anchor.BN;
    active: boolean;
    autoRenew: boolean;
    vaultTokenAccount: web3.PublicKey;
    prefundedAmount: anchor.BN;
    uniqueSeed: anchor.BN
    bump: number;
    duration: anchor.BN;
    planMetadata?: Plan
    planCreator: string
}
export type NotificationType = 'error' | 'success' | 'warning' | 'info';

export type Notification = {
    id: string;                 // DB primary key
    userPubkey: string;
    planName: string;
    title: string;
    tier: string;
    subscriptionPda: string;
    message: string;
    createdAt: string;
    type: NotificationType;
    is_read: string
};

export interface Transaction {
    id: number;
    userPubkey: string;
    plan: string;
    tier: string
    amount: number;
    status: string;
    subscriptionPda: string;    // related subscription
    txSignature?: string;
    createdAt: string; // ISO string
}

export interface UpdateParams {
    account?: Subscription,
}

export type UpdateField = "autoRenew" | "active" | "tier";

export type UpdateSubscriptionParams = {
    subscriptionPDA: string;
    field: UpdateField;
    value: boolean | string;
};


export interface UserTokenAccount {
    tokenAddress: string; // The address of the Token Account (not the mint)
    mint: string;    // The Mint address (Token A or Token B)
    amount: number;     // The balance held in the account (as a whole number)
    uiAmount: number;   // The balance held in the account (with decimals applied)
    decimals: number;   // The decimals of the associated mint
    name: string;
    symbol: string;
    description: string;
    image: string
}

export interface SubscriptionAccount {
    publicKey: PublicKey,
    account: Subscription
}

export interface FullTokenMetadata {
    name: string;
    symbol: string;
    uri: string;
    description: string;
    image: string;
    mintAddress: string;
}
export interface TokenMetadata {
    name: string;
    symbol: string;
    description: string;
    image: string; // The URL for the token image
    mintAddress: string;
}

export interface HeaderProps {
    title: string;
    refetch: () => void;
    setSearchQuery?: (query: string) => void;
    isFetching: boolean;
    setOpen?: Dispatch<SetStateAction<boolean>>
}

export interface TableHeaderProps {
    icon: React.ReactNode
    title: string
}

export interface Tier {
    tierName: string;
    amount: number | string | anchor.BN; // Flexible input
    periodSeconds: number | string | anchor.BN; // Flexible input
    description: string;
}
export type ScheduleSubscriptionRequest = {
    subscriptionPda: string
    planPda: string
    userTokenAccount: string
    receiverTokenAccount: string
    mint: string
    tokenProgram: string
    executeAtTs: number
}

export type ScheduleSubscriptionResponse = {
    success: boolean
    tx_signature: string
}
export interface Plan {
    creator?: string,
    receiver: string,
    mint: PublicKey | string,
    // token: PublicKey | string,
    tokenImage: string,
    tokenSymbol: string,
    name: string,
    tiers: Tier[],
    bump?: number;
}

export interface planQuery {
    publicKey: PublicKey,
    account: Plan
}

export type FormElement = HTMLInputElement | HTMLSelectElement;
// This interface must match the Rust `SubscriptionTier` struct exactly.
export interface SubscriptionTier {
    name: string;      // Max 32 chars
    amount: anchor.BN;     // u64 -> BN
    periodSeconds: anchor.BN; // i64 -> BN
    token: PublicKey;      // Pubkey -> PublicKey
}

export interface SubscriptionFormState {
    name: string
    payeeKey: string
    amount: string
    mintKey: string
    durationValue: number
    frequency: number,
    // firstPaymentDate: string;
    prefundAmount: number
}

export interface SubscriptionFormModalProps {
    isOpen: boolean
    onClose: () => void
}

export interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
}

// export interface PlanMetaData {
//     creator: PublicKey,
//     token: PublicKey,
//     mint: PublicKey,
//     name: string,
//     reciever: PublicKey,
//     tokenSymbol: string,
//     tiers: Tier[],
//     bump: PublicKey
// }
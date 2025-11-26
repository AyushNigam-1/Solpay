import { web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor"
import { Dispatch, SetStateAction } from "react";

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
    setSearchQuery: (query: string) => void;
    isFetching: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>
}

export interface TableHeaderProps {
    icon: React.ReactNode
    title: string
}

export type FormElement = HTMLInputElement | HTMLSelectElement;

export interface SubscriptionFormState {
    payeeKey: string
    amount: string
    mintKey: string
    durationValue: number
    frequency: number,
    firstPaymentDate: string;
    prefundAmount: number
}

export interface SubscriptionFormModalProps {
    isOpen: boolean
    onClose: () => void
    tokens: UserTokenAccount[]
}
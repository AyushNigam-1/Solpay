import { useState } from "react";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useProgramActions } from "@/app/hooks/useProgramActions";
import { PublicKey } from "@solana/web3.js";
import Cookies from "js-cookie"
import InputGroup from "./Input";

interface VaultActionProps {
    isOpen: boolean;
    onClose: () => void;
    action: "fund" | "withdraw";
    subscriptionPDA: string;
    currentBalance?: number; // optional: show current vault balance
    tokenSymbol?: string;    // e.g. "USDC"
    tokenImage?: string
    onSuccess?: () => void;
}

export default function VaultActions({
    isOpen,
    onClose,
    action,
    subscriptionPDA,
    currentBalance,
    tokenSymbol,
    tokenImage,
    onSuccess,
}: VaultActionProps) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const { manageVault } = useProgramActions()
    const publicKey = new PublicKey(Cookies.get("user")!)


    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        setLoading(true);
        try {
            const txSig = await manageVault(
                new PublicKey(subscriptionPDA),
                action,
                Number(amount) * 1_000_000,
                publicKey!
            );

            if (txSig) {
                alert(`${action === "fund" ? "Funded" : "Withdrawn"} successfully!`);
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isFund = action === "fund";
    const title = isFund ? "Fund" : "Withdraw";
    const Icon = isFund ? ArrowUpRight : ArrowDownRight;
    const color = isFund ? "emerald" : "orange";

    return (
        <div className="fixed inset-0 backdrop-blur-sm  z-50 flex items-center justify-center p-4">
            <div className="bg-white/5  rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={`bg-linear-to-r from-${color}-600 to-${color}-500  text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">

                            <div>
                                <h2 className="text-2xl font-bold">{title}</h2>
                                <p className="text-sm opacity-90">
                                    {/* {isFund ? "Add funds to subscription vault" : "Withdraw funds from vault"} */}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-full transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className='h-0.5 w-full bg-white/5' />
                {/* Body */}
                {/* Current Balance */}
                {currentBalance !== undefined && (
                    <div className="bg-white/5 rounded-xl p-3  space-y-2 ">

                        <p className="text-gray-400 text-sm">Balance</p>

                        <p className="text-3xl font-semibold text-white flex gap-2 items-end">
                            {currentBalance} <span className="text-lg flex gap-1 items-center text-gray-300" > <img
                                src={tokenImage}
                                className='w-5 rounded-full object-cover'
                            // alt={`${subscription.account.tokenMetadata.symbol} icon`}
                            /> {tokenSymbol}
                            </span>
                        </p>
                    </div>
                )}

                {/* Amount Input */}
                <InputGroup label={`Amount (${tokenSymbol})`} value={amount} type="number"
                    name="tierName" onChange={(e) => setAmount(e.target.value)} placeholder='0.00' />
                {/* <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount ({tokenSymbol})
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        disabled={loading}
                    />
                </div> */}

                {/* Submit Button */}
                <div className='h-0.5 w-full bg-white/5' />

                <button
                    onClick={handleSubmit}
                    disabled={loading || !amount}
                    className="w-full bg-blue-400 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold p-3 rounded-lg transition flex items-center justify-center gap-2 "
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                            Processing...
                        </span>
                    ) : (
                        <span className="flex gap-2">
                            <Icon className="w-6" /> {isFund ? "Fund Vault" : "Withdraw Funds"}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
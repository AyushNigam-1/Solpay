import { useState } from "react";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useProgramActions } from "@/app/hooks/useProgramActions";
import { PublicKey } from "@solana/web3.js";
import Cookies from "js-cookie";
import InputGroup from "./Input";

interface VaultActionsProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptionPDA: PublicKey;
    currentBalance?: number;
    tokenSymbol?: string;
    tokenImage?: string;
    onSuccess?: () => void;
}

export default function VaultActions({
    isOpen,
    onClose,
    subscriptionPDA,
    currentBalance = 0,
    tokenSymbol = "USDC",
    tokenImage = "/usdc.png",
    onSuccess,
}: VaultActionsProps) {
    const [activeTab, setActiveTab] = useState<"fund" | "withdraw">("fund");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const { manageVault } = useProgramActions();
    const publicKey = new PublicKey(Cookies.get("user")!);

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        setLoading(true);
        try {
            const txSig = await manageVault(
                new PublicKey(subscriptionPDA),
                activeTab,
                Number(amount) * 1_000_000, // 6 decimals for USDC
                publicKey
            );

            if (txSig) {
                alert(`${activeTab === "fund" ? "Funded" : "Withdrawn"} successfully!`);
                setAmount("");
                onSuccess?.();
                onClose();
            }
        } catch (error: any) {
            console.error("Vault action failed:", error);
            alert(error.message || "Transaction failed");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isFund = activeTab === "fund";

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <div
                className="bg-gray-900/95 border p-4 space-y-4 border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                {/* <div className=""> */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Manage Vault</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* </div> */}

                {/* Tabs */}
                <div className='h-0.5 w-full bg-white/5' />

                <div className="flex border rounded-2xl border-white/10">
                    <button
                        onClick={() => setActiveTab("fund")}
                        className={`flex-1 py-4 font-medium transition ${isFund
                            ? "bg-white/10 rounded-xl text-white"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpRight className="w-5 h-5" />
                            Fund
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        className={`flex-1 py-4 font-medium transition ${!isFund
                            ? "bg-white/10 text-white rounded-xl"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ArrowDownRight className="w-5 h-5" />
                            Withdraw
                        </div>
                    </button>
                </div>

                {/* Body */}
                {/* <div className="space-y-6"> */}
                {/* Balance */}
                {/* <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-sm"> Balance</p>
                    <p className="text-3xl font-bold text-white flex items-center justify-center gap-2 mt-2">
                        {(currentBalance / 1_000_000).toFixed(6)}
                        <img src={tokenImage} alt={tokenSymbol} className="w-6 h-6 rounded-full" />
                        <span>{tokenSymbol}</span>
                    </p>
                </div> */}
                <div className="bg-white/5 rounded-xl p-3  space-y-2 text-center">

                    <p className="text-gray-400 text-sm">Balance</p>

                    <p className="text-3xl font-semibold text-white flex gap-2 items-end justify-center">
                        {currentBalance} <span className="text-xl flex gap-1 items-center text-gray-300" >
                            {/* <img
                                src={tokenImage}
                                className='w-5 rounded-full object-cover'
                                alt={`${tokenSymbol} icon`}
                            /> */}
                            {tokenSymbol}
                        </span>
                    </p>
                </div>
                {/* Amount Input */}
                <InputGroup
                    name="amount"
                    label={`Amount to ${isFund ? "Fund" : "Withdraw"} (${tokenSymbol})`}
                    value={amount}
                    type="number"
                    placeholder="0.00"
                    onChange={(e) => setAmount(e.target.value)}
                />

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !amount}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${loading || !amount
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-blue-400"
                        }`}
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {isFund ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                            {isFund ? "Fund Vault" : "Withdraw Funds"}
                        </>
                    )}
                </button>
                {/* </div> */}
            </div>
        </div>
    );
}
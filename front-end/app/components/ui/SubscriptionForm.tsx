"use client"

import { useState } from "react";
import { FormElement, SubscriptionFormModalProps, SubscriptionFormState, UserTokenAccount } from "@/app/types";
import { useProgramActions } from "@/app/hooks/useProgramActions";
import { useProgram } from "@/app/hooks/useProgram";
import { PublicKey } from "@solana/web3.js";
import { useMutations } from "@/app/hooks/useMutations";
import InputGroup from "./Input";

export const SubscriptionForm: React.FC<SubscriptionFormModalProps> = ({ isOpen, onClose, tokens }) => {

    const initialFormState: SubscriptionFormState = {
        payeeKey: "",
        amount: "",
        mintKey: ",",
        frequency: 0,
        durationValue: 0,
        firstPaymentDate: "",
        prefundAmount: 0
    };

    const [formData, setFormData] = useState<SubscriptionFormState>(initialFormState);

    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<FormElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const { initializeSubscription } = useProgramActions()
    const { createSubscription, isMutating } = useMutations()
    const { publicKey } = useProgram()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // if (!receiver || !amount) return;

        setLoading(true);
        try {
            // Your wallet adapter + Anchor call here
            // console.log("Creating subscription:", { receiver, amount, token, frequency });
            // await createSubscriptionOnChain({ receiver, amount: Number(amount), token, frequency });
            alert("Subscription created!");
        } catch (err) {
            alert("Failed to create subscription");
        } finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        // if (!isMutating) {
        onClose();
        setTimeout(() => {
            // setSuccessPDA(null);
            setFormData(initialFormState);
        }, 300);
    }

    const modalClasses = isOpen
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-4 scale-95 pointer-events-none';

    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white-900/50 transition-opacity duration-300"
            onClick={handleClose}
        >
            <div
                className={`bg-white/5 rounded-xl shadow-2xl w-full max-w-lg transition-all duration-300 ease-out ${modalClasses} p-6 space-y-6`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className=" dark:border-gray-700 flex justify-between items-center ">
                    <h2 className="text-2xl font-bold text-white ">
                        {/* {data && "Re-"} */}
                        Create Subscription
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    // disabled={isMutating}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <hr className="border-t border-gray-600" />
                <form onSubmit={(e) => { e.preventDefault(); initializeSubscription(publicKey!, new PublicKey(formData.payeeKey), new PublicKey(formData.mintKey), formData.amount, formData.durationValue * formData.frequency, Math.floor(new Date(formData.firstPaymentDate).getTime() / 1000), formData.prefundAmount, false) }} className="space-y-6">
                    <InputGroup label="Reciever" name="payeeKey" value={(formData.payeeKey)!} onChange={handleChange} placeholder="Reciever" />
                    <InputGroup label="Amount" name="amount" value={(formData.amount)!} onChange={handleChange} placeholder="Amount" />
                    <InputGroup label="First Payment Date" name="firstPaymentDate" type="date" value={(formData.firstPaymentDate)!} onChange={handleChange} placeholder="Date" />
                    <div>
                        <label className="block text-sm font-medium mb-2">Token</label>
                        <select
                            name="mintKey"
                            value={formData.mintKey}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none dark:bg-gray-700 dark:text-gray-200 transition appearance-none"
                        >
                            {
                                tokens?.map(token => <option key={token.name} value={token.mint} >{token.name} ({token.symbol})</option>
                                )
                            }
                        </select>
                    </div>
                    <div className="flex gap-3 items-end">
                        <InputGroup
                            type="number"
                            name="durationValue"
                            value={formData.durationValue}
                            onChange={handleChange}
                            placeholder="e.g., 7"
                            label='Subscription Duration'
                        // disabled={isMutating}
                        />
                        <select
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                            className="max-w-max px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm  dark:bg-gray-700 dark:text-gray-200 disabled:bg-gray-100 disabled:dark:bg-gray-600 transition appearance-none"
                            required
                        // disabled={isMutating}
                        >
                            <option value={86400}>Days</option>
                            <option value={3600}>Hours</option>
                            <option value={60}>Minutes</option>
                            <option value={1}>Seconds</option>
                        </select>
                    </div>
                    <InputGroup
                        type="number"
                        name="prefundAmount"
                        value={formData.prefundAmount}
                        onChange={handleChange}
                        placeholder=""
                        label='Prefund Amount'
                    // disabled={isMutating}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-400 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold p-3 rounded-lg transition flex items-center justify-center gap-2 "
                    >
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {isMutating ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </div>
                            ) : (
                                <>
                                    Create
                                </>
                            )}
                        </>
                    </button>
                </form>
            </div>
        </div>
    );
}



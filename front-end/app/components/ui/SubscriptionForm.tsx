"use client"

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { UserTokenAccount } from "@/app/types";


type FormElement = HTMLInputElement | HTMLSelectElement;

interface SubscriptionFormState {
    reciever: string
    amount: string
    tokenMint: string
    frequency: string
}

interface SubscriptionFormModalProps {
    isOpen: boolean
    onClose: () => void
    tokens: UserTokenAccount[]
}



export const SubscriptionForm: React.FC<SubscriptionFormModalProps> = ({ isOpen, onClose, tokens }) => {

    const initialFormState: SubscriptionFormState = {
        reciever: "",
        amount: "",
        tokenMint: ",",
        frequency: ""
    };

    const [formData, setFormData] = useState<SubscriptionFormState>(initialFormState);

    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<FormElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
                <form onSubmit={handleSubmit} className="space-y-6">
                    <InputGroup label="Reciever" name="reciever" value={(formData.reciever)!} onChange={handleChange} placeholder="Reciever" />
                    <InputGroup label="Amount" name="amount" value={(formData.amount)!} onChange={handleChange} placeholder="Amount" />
                    <div>
                        <label className="block text-sm font-medium mb-2">Token</label>
                        <select
                            name="tokenMint"
                            value={formData.tokenMint}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none dark:bg-gray-700 dark:text-gray-200"
                        >
                            {
                                tokens.map(token => <option key={token.name} value={token.mint} >{token.name} ({token.symbol})</option>
                                )
                            }
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Every</label>
                        <select
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 outline-none dark:bg-gray-700 dark:text-gray-200 "
                        >
                            <option value="daily">Day</option>
                            <option value="weekly">Week</option>
                            <option value="monthly">Month</option>
                            <option value="yearly">Year</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-400 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold p-3 rounded-lg transition flex items-center justify-center gap-2 "
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating...
                            </>
                        ) : <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Create Subscription
                        </>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}


const InputGroup: React.FC<{
    label: string;
    name: keyof SubscriptionFormState;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
    disabled?: boolean;
}> = ({ label, name, value, onChange, placeholder, type = 'text', disabled }) => (
    <div className='w-full '>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            step={type === 'number' ? 'any' : undefined}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm  dark:bg-gray-700 dark:text-gray-200 disabled:bg-gray-100 disabled:dark:bg-gray-600 transition"
        />
    </div>
);
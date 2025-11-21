"use client"
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useActions } from "../../hooks/useActions"
import { useForm } from 'react-hook-form';
import Cookies from 'js-cookie';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
const page = () => {
    const publicKey = Cookies.get("user")!

    interface FormData {
        payerKey: string;
        payeeKey: string;
        mintKey: string;
        globalStatsKey: string;
        amount: number;
        periodSeconds: number;
        firstPaymentTs: string;
        autoRenew: boolean;
    }
    const periodOptions = [
        { label: "Daily", seconds: 60 * 60 * 24 },
        { label: "Weekly", seconds: 60 * 60 * 24 * 7 },
        { label: "Monthly", seconds: 60 * 60 * 24 * 30 },
        { label: "Quarterly", seconds: 60 * 60 * 24 * 90 },
        { label: "Annually", seconds: 60 * 60 * 24 * 365 },
    ];
    const today = new Date();
    today.setDate(today.getDate() + 1); // Set default to tomorrow
    const defaultDate = today.toISOString().split('T')[0];
    const { fetchUserSubscriptions } = useActions()

    const { data, isLoading, isFetching, refetch, isError } = useQuery({
        queryKey: ["GlobalStats"],
        queryFn: () => fetchUserSubscriptions(),
        staleTime: 1000 * 60 * 5,
    });

    const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
        defaultValues: {
            payerKey: publicKey,
            payeeKey: "",
            mintKey: "",
            // globalStatsKey: MOCK_GLOBAL_STATS_KEY,
            amount: 0.1,
            periodSeconds: periodOptions[2].seconds, // Default to Monthly
            firstPaymentTs: defaultDate,
            autoRenew: true,
        }
    });

    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string | null }>({ type: null, message: null });

    const selectedPeriod = watch('periodSeconds');

    const onSubmit = async (data: FormData) => {
        setStatus({ type: null, message: null });
        // try {
        //     const result = await mockInitializeSubscription(data);
        //     if (result) {
        //         setStatus({ type: 'success', message: `Subscription successfully initialized! PDA: ${result.toBase58()}` });
        //     } else {
        //         setStatus({ type: 'error', message: "Failed to get PDA key after transaction. Check console." });
        //     }
        // } catch (e) {
        //     setStatus({ type: 'error', message: e.message || "An unknown error occurred during transaction." });
        // }
    };

    const StatusMessage = () => {
        if (!status.message) return null;
        const baseClasses = "p-4 rounded-lg font-medium mb-4 shadow-md";
        const colorClasses = status.type === 'success'
            ? "bg-green-100 border border-green-400 text-green-700"
            : "bg-red-100 border border-red-400 text-red-700";
        return (
            <div className={`${baseClasses} ${colorClasses} break-all text-sm`}>
                {status.message}
            </div>
        );
    };

    const InputField = ({ label, name, register, options, type = 'text', readOnly = false }: { label: string, name: string, register: string, options: string, type: string, readOnly: boolean }) => (
        <div className="flex flex-col space-y-1">
            <label htmlFor={name} className="text-sm font-medium text-gray-700">{label}</label>
            <input
                id={name}
                type={type}
                className={`w-full p-3 border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                readOnly={readOnly}
                {...register(name, options)}
            />
            {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
        </div>
    );

    return (
        // Modal-like overlay wrapper
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center p-4">
            {/* Form Card */}
            <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-2xl space-y-6">
                <h2 className="text-3xl font-bold text-indigo-700 text-center">
                    New Subscription
                </h2>
                <p className="text-gray-500 text-center">
                    Define the parameters for the automatic recurring payment.
                </p>

                <StatusMessage />

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    {/* Public Key Inputs (Read-Only Payer) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField
                            label="Payer Wallet (You)"
                            name="payerKey"
                            register={register}
                            readOnly
                            options={{ required: "Payer key is required" }}
                        />
                        <InputField
                            label="Payee Key (Recipient)"
                            name="payeeKey"
                            register={register}
                            options={{ required: "Payee key is required", pattern: { value: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, message: "Invalid Solana Address" } }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField
                            label="Token Mint Address"
                            name="mintKey"
                            register={register}
                            options={{ required: "Mint key is required", pattern: { value: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, message: "Invalid Solana Address" } }}
                        />
                        <InputField
                            label="Global Stats Key (Admin)"
                            name="globalStatsKey"
                            register={register}
                            options={{ required: "Global Stats key is required", pattern: { value: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, message: "Invalid Solana Address" } }}
                        />
                    </div>

                    <h3 className="text-xl font-semibold text-gray-700 pt-3 border-t">Payment Details</h3>

                    {/* Amount, Period, and Date Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <InputField
                            label="Amount (e.g., 0.1)"
                            name="amount"
                            type="number"
                            register={register}
                            options={{
                                required: "Amount is required",
                                valueAsNumber: true,
                                min: { value: 0.000001, message: "Amount must be positive" }
                            }}
                        />

                        {/* Period Selection */}
                        <div className="flex flex-col space-y-1">
                            <label htmlFor="periodSeconds" className="text-sm font-medium text-gray-700">Payment Frequency</label>
                            <select
                                id="periodSeconds"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                                {...register("periodSeconds", { valueAsNumber: true, required: "Frequency is required" })}
                            >
                                {periodOptions.map(option => (
                                    <option key={option.seconds} value={option.seconds}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedPeriod} seconds per period
                            </p>
                        </div>

                        {/* First Payment Timestamp */}
                        <InputField
                            label="First Payment Date"
                            name="firstPaymentTs"
                            type="date"
                            register={register}
                            options={{ required: "Date is required" }}
                        />
                    </div>

                    {/* Auto Renew Toggle */}
                    <div className="flex items-center space-x-3 pt-3">
                        <input
                            id="autoRenew"
                            type="checkbox"
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            {...register("autoRenew")}
                        />
                        <label htmlFor="autoRenew" className="text-sm font-medium text-gray-700 select-none">
                            Auto Renew Subscription
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex justify-center items-center"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending Transaction...
                            </>
                        ) : (
                            "Create Subscription"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default page
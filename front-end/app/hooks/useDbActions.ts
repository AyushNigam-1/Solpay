import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentHistory, ScheduleSubscriptionRequest, ScheduleSubscriptionResponse, UpdateParams, UpdateSubscriptionParams } from "../types";
import axios from "axios";

export const useDbActions = () => {
    const API_BASE = "http://127.0.0.1:3000"
    const queryClient = useQueryClient();

    const useGetUserTransactions = () => {
        return useMutation({
            mutationFn: async ({
                userPubkey,
            }: {
                userPubkey: string;
            }) => {
                const res = await axios.get<PaymentHistory[]>(
                    `${API_BASE}/transactions/${userPubkey}`
                );
                return res.data;
            },

            onSuccess: (data) => {
                console.log("✅ Transactions fetched:", data);
            },

            onError: (error) => {
                console.error("❌ Failed to fetch transactions:", error);
            },
        });
    };

    const deleteNotification = useMutation({
        mutationFn: async ({ notificationId }: {
            notificationId: string; // or bigint if IDs are large
        }) => {
            const response = await axios.delete(
                `${API_BASE}/api/notifications/${notificationId}`
            );

            if (response.status !== 200) {
                throw new Error(response.data.error || 'Failed to delete notification');
            }

            return response.data;
        },
        onSuccess: (data) => {
            console.log('Notification deleted successfully:', data);
            // Invalidate notifications list for this user
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            // queryClient.invalidateQueries({ queryKey: ['notifications', userPubkey] });
        },
        onError: (error: any) => {
            console.error('Error deleting notification:', error);
            // toast.error(error.message || 'Failed to delete notification');
        },
    });

    const renewSubscription = useMutation({
        mutationFn: async ({
            subscriptionPda,
        }: {
            subscriptionPda: string;
        }) => {
            const res = await axios.post(
                `${API_BASE}/api/subscriptions/${subscriptionPda}`
            );
            return res.data;
        },

        onSuccess: (data) => {
            console.log("✅ Subscription renewal triggered:", data);
        },

        onError: (error: any) => {
            console.error(
                "❌ Failed to renew subscription:",
                error?.response?.data || error.message
            );
        },
    });

    const deleteTransaction = useMutation({
        mutationFn: async (id: number) => {
            const response = await axios.delete(
                `${API_BASE}/api/transactions/${id}`
            );

            if (response.status !== 200) {
                throw new Error(response.data.error || 'Failed to delete transaction');
            }

            return response.data;
        },
        onSuccess: (data) => {
            console.log('Transaction deleted successfully:', data);

            // Invalidate all relevant transaction queries
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            // queryClient.invalidateQueries({ queryKey: ['transactions', userPubkey] });
        },
        onError: (error: any) => {
            console.error('Error deleting transaction:', error);
            // toast.error(error.message || 'Failed to delete transaction');
        },
    });


    const createSubscriptionDb = useMutation({
        mutationFn: async ({
            account,
        }: UpdateParams) => {
            console.log("account", account)
            const response = await axios.post(`${API_BASE}/api/subscriptions`, account, {
                headers: { "Content-Type": "application/json" },
            });
            return response.data;
        },
        onSuccess: (data) => {
            console.log("✅ Escrow updated successfully:", data);
        },
        onError: (error) => {
            console.error("❌ Failed to update escrow:", error);
        },
    });

    const updateSubscriptionDb = useMutation({
        mutationFn: async ({
            subscriptionPDA,
            field,
            value,
        }: UpdateSubscriptionParams) => {
            console.log(
                "✏️ Updating subscription:",
                subscriptionPDA,
                field,
                value
            );
            let wrappedValue: any;
            if (typeof value === "boolean") {
                wrappedValue = { Bool: value };
            } else if (typeof value === "string") {
                wrappedValue = { String: value };
            } else {
                throw new Error("Unsupported value type");
            }

            console.log("✏️ Updating subscription:", subscriptionPDA, field, wrappedValue);
            const response = await axios.patch(
                `${API_BASE}/api/subscriptions/${subscriptionPDA}`,
                {
                    field,
                    value: wrappedValue,
                }
            );
            return response.data;
        },
        onSuccess: (data) => {
            console.log("✅ Subscription updated successfully:", data);
            // Invalidate all subscription queries (clean + honest)
            queryClient.invalidateQueries({
                queryKey: ["subscriptions"],
            });
        },
        onError: (error: any) => {
            console.error("❌ Failed to update subscription:", error);
            alert("Failed to update subscription. Check console.");
        },
    });

    const deleteSubscriptionDb = useMutation({
        mutationFn: async ({ subscriptionPDA }: {
            subscriptionPDA: string;            // subscription PDA as string
        }) => {
            console.log("Deleting subscription from DB:", subscriptionPDA);
            const response = await axios.delete(
                `${API_BASE}/api/subscriptions/${subscriptionPDA}`,
            );
            return response.data;
        },
        onSuccess: (data) => {
            console.log("✅ Subscription deleted from DB successfully:", data);
            // Optional: invalidate/refetch user's subscriptions list
            queryClient.invalidateQueries({
                queryKey: ['subscriptions', data.address || 'all']
            });
        },

        onError: (error: any) => {
            console.error("❌ Failed to delete subscription from DB:", error);
            alert("Failed to remove from database. Check console.");
        },
    });

    async function scheduleSubscription(
        params: ScheduleSubscriptionRequest
    ): Promise<ScheduleSubscriptionResponse> {
        try {
            const res = await axios.post<ScheduleSubscriptionResponse>(
                `${API_BASE}/api/schedule-subscription`,
                {
                    subscription_pda: params.subscriptionPda,
                    plan_pda: params.planPda,
                    user_token_account: params.userTokenAccount,
                    receiver_token_account: params.receiverTokenAccount,
                    mint: params.mint,
                    token_program: params.tokenProgram,
                    execute_at_ts: params.executeAtTs,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 15_000,
                }
            )

            if (!res.data.success) {
                throw new Error("TukTuk scheduling failed (success=false)")
            }

            console.log("✅ Task scheduled via TukTuk")
            console.log("Tx signature:", res.data.tx_signature)

            return res.data
        } catch (err: any) {
            // Axios-specific error handling
            if (axios.isAxiosError(err)) {
                console.error("❌ Axios error")

                if (err.response) {
                    console.error("Status:", err.response.status)
                    console.error("Response:", err.response.data)
                    throw new Error(
                        typeof err.response.data === "string"
                            ? err.response.data
                            : JSON.stringify(err.response.data)
                    )
                }

                if (err.request) {
                    console.error("❌ No response from backend")
                    throw new Error("Backend not reachable")
                }

                throw new Error(err.message)
            }

            console.error("❌ Unknown error:", err)
            throw err
        }
    }

    return { createSubscriptionDb, deleteSubscriptionDb, updateSubscriptionDb, scheduleSubscription, useGetUserTransactions, deleteNotification, deleteTransaction, renewSubscription }
}
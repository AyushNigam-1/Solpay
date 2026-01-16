import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Notification, Transaction, ScheduleSubscriptionRequest, ScheduleSubscriptionResponse, SubscriptionAccount, UpdateParams, UpdateSubscriptionParams } from "../types";
import axios from "axios";

export const useDbActions = () => {
    const API_BASE = "http://127.0.0.1:3001"
    const queryClient = useQueryClient();

    const useGetUserTransactions = () => {
        return useMutation({
            mutationFn: async ({
                userPubkey,
            }: {
                userPubkey: string;
            }) => {
                const res = await axios.get<Transaction[]>(
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

        onSuccess: (data, { notificationId }) => {
            console.log(notificationId)
            queryClient.setQueryData<Notification[]>(['notifications'], (notifications) => notifications ? notifications.filter(notification => notification.id != notificationId) : [])
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
        onSuccess: (_, id) => queryClient.setQueryData<Transaction[]>(['transactions'], (transactions) => transactions ? transactions.filter(transaction => transaction.id != id) : []),
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
        onSuccess: (_, { subscriptionPDA }) => {
            console.log(subscriptionPDA)
            queryClient.setQueryData<SubscriptionAccount[]>(['userSubscriptions'], (subscriptions) => subscriptions ? subscriptions.filter(subscription => subscription.publicKey.toBase58() != subscriptionPDA) : [])
        },

        onError: (error: any) => {
            console.error("❌ Failed to delete subscription from DB:", error);
            alert("Failed to remove from database. Check console.");
        },
    });


    return { createSubscriptionDb, deleteSubscriptionDb, updateSubscriptionDb, useGetUserTransactions, deleteNotification, deleteTransaction, renewSubscription }
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateParams, UpdateSubscriptionParams } from "../types";
import axios from "axios";

export const useDbActions = () => {
    const API_BASE = "http://127.0.0.1:3000"
    const queryClient = useQueryClient();

    const createSubscriptionDb = useMutation({
        mutationFn: async ({
            account,
        }: UpdateParams) => {
            // console.log(action)
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

            const response = await axios.patch(
                `${API_BASE}/api/subscriptions/${subscriptionPDA}`,
                {
                    field,
                    value,
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
    return { createSubscriptionDb, deleteSubscriptionDb, updateSubscriptionDb }
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProgramActions } from "./useProgramActions";
import { PublicKey } from "@solana/web3.js";
import { Plan, Tier, UpdateField } from "../types";
import { useDbActions } from "./useDbActions";

export const useMutations = () => {
    const programActions = useProgramActions();
    const { createSubscriptionDb, deleteSubscriptionDb, updateSubscriptionDb } = useDbActions()
    const queryClient = useQueryClient();

    const createPlan = useMutation({
        mutationFn: async ({ creatorKey, plan }: {
            creatorKey: PublicKey;
            plan: Plan;
        }): Promise<string | undefined> => {
            const txSig = await programActions.createPlan(creatorKey, plan);
            if (!txSig) {
                throw new Error("Failed to create plan");
            }
            return txSig;
        },

        onSuccess: (txSig, variables) => {
            // toast.success("Plan created successfully!");
            console.log("New Plan PDA:", variables.plan.name);
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            queryClient.invalidateQueries({ queryKey: ["plans"] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to create plan:", error);
            // toast.error(
            //     error.message || "Failed to create plan. Check console for details."
            // );
        },
    });

    const updatePlan = useMutation({
        mutationFn: async ({
            name,
            creatorKey,
            receiver,
            tiers,
        }: {
            name: string;
            creatorKey: PublicKey;
            receiver: PublicKey;
            tiers: Tier[];
        }) => {
            try {
                const txSignature = await programActions.updatePlan({
                    name,
                    creatorKey,
                    receiver,
                    tiers,
                });

                return {
                    signature: txSignature,
                };
            } catch (err: any) {
                throw new Error(
                    err?.message || "Failed to update plan"
                );
            }
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["my-plan"] });

        },

        onError: (error: any) => {
            console.error("Failed to create subscription:", error);
            // toast.error(error.message || "Failed to create subscription");
        },
    });

    const createSubscription = useMutation({
        mutationFn: async ({
            tier,
            planPDA,
            planName,
            payerKey,
            periodSeconds,
            amount,
            autoRenew,
            receiver,
            mint
        }: {
            tier: string;
            planPDA: PublicKey;
            planName: string,
            payerKey: PublicKey;
            periodSeconds: number;
            amount: number;          // 🔒 locked price
            autoRenew?: boolean;
            receiver: PublicKey,
            mint: PublicKey
        }) => {
            const subscription = await programActions.initializeSubscription(
                tier,                   // tier name
                planPDA,                // plan PDA
                payerKey,               // user wallet
                periodSeconds,          // billing period
                amount,                 // 🔒 locked amount
                autoRenew,
                receiver,
                mint,
            );
            if (!subscription) {
                throw new Error("Failed to create subscription");
            }
            return subscription;

        },

        onSuccess: async ({ subscriptionPDA, account }, { planName }) => {
            // toast.success("Subscription created successfully!");
            console.log("New Subscription PDA:", subscriptionPDA, account);
            createSubscriptionDb.mutate({ account: { ...account, planName } })
            // Refetch your subscriptions list
            // queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            // queryClient.invalidateQueries({ queryKey: ["userSubscriptions", payerKey.toBase58()] });
        },

        onError: (error: any) => {
            console.error("Failed to create subscription:", error);
            // toast.error(error.message || "Failed to create subscription");
        },
    });

    const cancelPlan = useMutation({
        mutationFn: async (creatorKey: PublicKey | string) => {
            const txSig = await programActions.cancelPlan(creatorKey);
            if (!txSig) {
                throw new Error('Failed to cancel plan');
            }
            return txSig;
        },

        onSuccess: (_, creatorKey) => queryClient.setQueryData<Plan[]>(['plans'], (plans) => plans ? plans.filter(plan => plan.creator == creatorKey) : []),

        onError: (error) => {
            console.error('Error cancelling plan:', error);
            // toast.error('Failed to cancel plan');
        },
    });

    const deleteSubscription = useMutation({
        mutationFn: async ({
            payerKey,
            uniqueSeed,
        }: {
            payerKey: PublicKey;
            uniqueSeed: Buffer;
            mintAddress: PublicKey;
            vaultTokenAccount: PublicKey;
        }) => {
            const txSig = await programActions.cancelSubscription(
                payerKey,
                uniqueSeed,
            );
            if (!txSig) {
                throw new Error("Transaction failed or was cancelled");
            }
            return txSig;
        },

        onSuccess: ({ subscriptionPDA }) => deleteSubscriptionDb.mutate({ subscriptionPDA }),

        onError: (error: any) => {
            console.error("Failed to cancel subscription:", error);
            //   toast.error(
            //     error.message || "Failed to cancel subscription"
            //   );
        },
    });


    const editSubscription = async ({
        subscriptionPDA,
        field,
        value,
        payerKey,
    }: {
        subscriptionPDA: PublicKey;
        field: UpdateField;
        value: boolean | string;
        payerKey: PublicKey;
    }) => {
        const txSig = await programActions.updateSubscription(subscriptionPDA, field, value, payerKey);
        if (!txSig) {
            throw new Error("Update failed");
        }
        return txSig;
    }

    const manageStatus = useMutation({
        mutationFn: editSubscription,
        onSuccess: (txSig, { field, subscriptionPDA, value }) => {
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            updateSubscriptionDb.mutate({ field, subscriptionPDA: String(subscriptionPDA), value })
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    });

    const manageAutoRenew = useMutation({
        mutationFn: editSubscription,
        onSuccess: (txSig, { field, subscriptionPDA, value }) => {
            // toast.success(
            //     `${variables.field === "tier" ? "Tier" : variables.field === "autoRenew" ? "Auto-Renew" : variables.field === "active" ? "Status" : "Duration"} updated successfully!`
            // );
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            updateSubscriptionDb.mutate({ field, subscriptionPDA: String(subscriptionPDA), value })

            // Refetch relevant queries
            // queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            // queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            // queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    })

    const managePlan = useMutation({
        mutationFn: editSubscription,
        onSuccess: (txSig, { field, subscriptionPDA, value }) => {
            // toast.success(
            //     `${variables.field === "tier" ? "Tier" : variables.field === "autoRenew" ? "Auto-Renew" : variables.field === "active" ? "Status" : "Duration"} updated successfully!`
            // );
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);
            updateSubscriptionDb.mutate({ field, subscriptionPDA: String(subscriptionPDA), value })

            // Refetch relevant queries
            // queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            // queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            // queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    })
    return { createSubscription, manageStatus, manageAutoRenew, managePlan, createPlan, updatePlan, cancelPlan, deleteSubscription }
}
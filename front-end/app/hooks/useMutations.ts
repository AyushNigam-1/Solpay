import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProgramActions } from "./useProgramActions";
import { PublicKey } from "@solana/web3.js";
import { Plan, UpdateField } from "../types";

export const useMutations = () => {
    const programActions = useProgramActions();
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

            // Refetch relevant data
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            queryClient.invalidateQueries({ queryKey: ["userPlans", variables.creatorKey.toBase58()] });
            queryClient.invalidateQueries({ queryKey: ["allPlans"] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to create plan:", error);
            // toast.error(
            //     error.message || "Failed to create plan. Check console for details."
            // );
        },
    });

    const createSubscription = useMutation({
        mutationFn: async ({
            tier,
            planPDA,
            payerKey,
            mintKey,
            periodSeconds,
            autoRenew = true,
        }: {
            tier: string;
            planPDA: PublicKey;
            payerKey: PublicKey;
            mintKey: PublicKey;
            periodSeconds: number;
            autoRenew?: boolean;
        }) => {
            const subscriptionPDA = await programActions.initializeSubscription(
                tier,
                planPDA,
                payerKey,
                mintKey,
                periodSeconds,
                autoRenew
            );
            if (!subscriptionPDA) {
                throw new Error("Failed to create subscription");
            }
            return subscriptionPDA;
        },

        onSuccess: (subscriptionPDA) => {
            // toast.success("Subscription created successfully!");
            console.log("New Subscription PDA:", subscriptionPDA.toBase58());
            // Refetch your subscriptions list
            // queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            // queryClient.invalidateQueries({ queryKey: ["userSubscriptions", payerKey.toBase58()] });
        },

        onError: (error: any) => {
            console.error("Failed to create subscription:", error);
            // toast.error(error.message || "Failed to create subscription");
        },
    });


    const deleteSubscription = useMutation({
        mutationFn: async ({
            payerKey,
            uniqueSeed,
            mintAddress,
            vaultTokenAccount,
        }: {
            payerKey: PublicKey;
            uniqueSeed: Buffer;
            mintAddress: PublicKey;
            vaultTokenAccount: PublicKey;
        }) => {
            const txSig = await programActions.cancelSubscription(
                payerKey,
                uniqueSeed,
                mintAddress,
                vaultTokenAccount
            );

            if (!txSig) {
                throw new Error("Transaction failed or was cancelled");
            }

            return txSig;
        },

        onSuccess: (txSig) => {
            //   toast.success("Subscription cancelled successfully!");
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // Refetch your subscriptions
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["userSubscriptions"] });
        },

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
        value: boolean | number | string;
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
        onSuccess: (txSig, variables) => {
            // toast.success(
            //     `${variables.field === "tier" ? "Tier" : variables.field === "autoRenew" ? "Auto-Renew" : variables.field === "active" ? "Status" : "Duration"} updated successfully!`
            // );
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // Refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    });
    const manageAutoRenew = useMutation({
        mutationFn: editSubscription,
        onSuccess: (txSig, variables) => {
            // toast.success(
            //     `${variables.field === "tier" ? "Tier" : variables.field === "autoRenew" ? "Auto-Renew" : variables.field === "active" ? "Status" : "Duration"} updated successfully!`
            // );
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // Refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    })
    const managePlan = useMutation({
        mutationFn: editSubscription,
        onSuccess: (txSig, variables) => {
            // toast.success(
            //     `${variables.field === "tier" ? "Tier" : variables.field === "autoRenew" ? "Auto-Renew" : variables.field === "active" ? "Status" : "Duration"} updated successfully!`
            // );
            console.log("Tx:", `https://solana.fm/tx/${txSig}?cluster=devnet-solana`);

            // Refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
        },

        onError: (error: any, variables) => {
            console.error("Failed to update subscription:", error);
            // toast.error(`Failed to update ${variables.field}: ${error.message || "Unknown error"}`);
        },
    })
    return { createSubscription, manageStatus, manageAutoRenew, managePlan, createPlan, deleteSubscription }
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProgramActions } from "./useProgramActions";
import { PublicKey } from "@solana/web3.js";
import { Plan, UpdateField } from "../types";
import { useDbActions } from "./useDbActions";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getMintProgramId } from "../utils/token";

export const useMutations = () => {
    const programActions = useProgramActions();
    const { createSubscriptionDb, deleteSubscriptionDb, updateSubscriptionDb, scheduleSubscription } = useDbActions()
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
            periodSeconds,
            amount,
            autoRenew,
            receiver,
            mint
        }: {
            tier: string;
            planPDA: PublicKey;
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
                // auto-renew flag
            );
            if (!subscription) {
                throw new Error("Failed to create subscription");
            }
            return subscription;

        },

        onSuccess: async ({ subscriptionPDA, account }, { amount, mint, payerKey, periodSeconds, planPDA, receiver, tier, autoRenew }) => {
            // toast.success("Subscription created successfully!");
            console.log("New Subscription PDA:", subscriptionPDA, account);
            createSubscriptionDb.mutate({ account })
            if (!autoRenew) {
                console.log("ℹ️ Auto-renew disabled, skipping TukTuk scheduling")
                return
            }

            try {
                const userTokenAccount = await getAssociatedTokenAddress(
                    mint,
                    payerKey
                )

                const receiverTokenAccount = await getAssociatedTokenAddress(
                    mint,
                    receiver
                )
                const tokenProgram = await getMintProgramId(mint)
                const executeAtTs =
                    Math.floor(Date.now() / 1000) + periodSeconds

                console.log("🕒 Scheduling payment at:", executeAtTs)

                await scheduleSubscription({
                    subscriptionPda: subscriptionPDA,
                    planPda: planPDA.toBase58(),
                    userTokenAccount: userTokenAccount.toBase58(),
                    receiverTokenAccount: receiverTokenAccount.toBase58(),
                    mint: mint.toBase58(),
                    tokenProgram: tokenProgram.toBase58(),
                    executeAtTs,
                })

                console.log("✅ TukTuk task scheduled successfully")
            } catch (err) {
                console.error("❌ Failed to schedule TukTuk task", err)
                // optional: show toast or mark subscription as "needs retry"
            }
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

        onSuccess: ({ subscriptionPDA }) => {
            deleteSubscriptionDb.mutate({ subscriptionPDA })
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
            // queryClient.invalidateQueries({ queryKey: ["subscription", variables.subscriptionPDA.toBase58()] });
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            // queryClient.invalidateQueries({ queryKey: ["userSubscriptions", variables.payerKey.toBase58()] });
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
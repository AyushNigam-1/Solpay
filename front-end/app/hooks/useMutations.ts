// import { useMutation } from "@tanstack/react-query";
// import { useProgramActions } from "./useProgramActions";

// export const useMutations = ({ setPendingId }: MutationHookProps = {}) => {
//     const contractActions = useProgramActions();

//     const createSubscription = useMutation({
//         mutationFn: async (params) => {
//             return await contractActions.initializeSubscription(
//                 // parseFloat(params.initializerAmount),
//                 // parseFloat(params.takerExpectedAmount),
//                 // new PublicKey(params.initializerDepositMint),
//                 // new PublicKey(params.takerExpectedMint),
//                 // convertTimeToSeconds(Number(params.durationValue), params.durationUnit)!
//             );
//         },
//         onSuccess: ({ account, publicKey }) => {
//             console.log("✅ Escrow Initialized Successfully! PDA:", account);
//             updateEscrowDb.mutate({ address: userAddress, escrow: { account: { ...account, expiresAt: account.expiresAt.toString(10) }, createdAt: new Date().toISOString(), status: "Pending", publicKey }, action: 'create' })
//             queryClient.invalidateQueries({ queryKey: ['AllEscrows'] });
//             queryClient.invalidateQueries({ queryKey: ['history', userAddress] })
//         },

//         onError: (error) => {
//             console.error("Escrow initialization failed:", error.message);
//         },
//     });
//     return { createSubscription, isMutating: createSubscription.isPending }
// }
"use client"

import { useProgram } from '@/app/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import * as anchor from "@coral-xyz/anchor"
import { useEffect, useState } from 'react';
import { CheckCircle2, EyeIcon, XCircle } from 'lucide-react';
import Header from '@/app/components/ui/layout/Header';
import Error from '@/app/components/ui/extras/Error';
import Loader from '@/app/components/ui/extras/Loader';
import TableHeaders from '@/app/components/ui/layout/TableHeaders';
import SubscriptionDetails from '@/app/components/ui/modals/SubscriptionDetails';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Subscription } from '@/app/types';
import { TABLE_HEADERS } from '@/app/utils/headers';
import { useSearch } from '@/app/hooks/useSearch';
import { StatusBadge } from '@/app/components/ui/layout/StatusBadge';
import { formatPeriod } from '@/app/utils/duration';
const page = () => {
    const { publicKey, PROGRAM_ID } = useProgram()
    const { fetchSubscriptionsByPlan } = useProgramActions()
    const [planPDA, setPlanPDA] = useState<PublicKey>()
    const [subscription, setSubscription] = useState<Subscription & { publicKey: PublicKey }>();
    const [openDetails, setOpenDetails] = useState<boolean>(false)

    useEffect(() => {
        if (publicKey) {
            const [plan_PDA] = PublicKey.findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("plan"),
                    publicKey!.toBuffer(),
                ],
                PROGRAM_ID
            );
            setPlanPDA(plan_PDA)
        }
    }, [publicKey])

    const {
        data: subscribers,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<{ publicKey: PublicKey, account: Subscription }[]>({
        queryKey: [""],
        queryFn: async () => await fetchSubscriptionsByPlan(planPDA!),
        enabled: !!publicKey && !!planPDA,
        staleTime: 1000 * 60, // 1 min cache (tweak if needed)
    });

    const { searchQuery, setSearchQuery, filteredData } = useSearch(
        subscribers?.map((subscriber) => ({
            ...subscriber.account,
            publicKey: subscriber.publicKey
        })),
        ['payer', 'tierName']
    );



    return (
        <div className='space-y-4 font-mono'>
            <Header title="Subscribers" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <div className=''>
                {isLoading || isFetching ? (
                    <Loader />
                ) :
                    isQueryError ? <Error refetch={refetch} /> :
                        (filteredData?.length != 0) ?
                            <>
                                <div className="relative overflow-x-auto shadow-xs rounded-lg ">
                                    {/* <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={TABLE_HEADERS.creator.subscriptions} />
                                        <tbody>
                                            {filteredData?.map((subscriber) => {
                                                return (
                                                    <tr className="border-t-0 border-2 border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => { setSubscription(subscriber); setOpenDetails(true) }}
                                                    >
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {subscriber.payer?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-gray-400">
                                                            {subscriber.tierName}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <StatusBadge
                                                                active={subscriber.autoRenew}
                                                                label={subscriber.autoRenew ? "Enabled" : "Disabled"}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge
                                                                active={subscriber.active}
                                                                label={subscriber.active ? "Active" : "Inactive"}
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table> */}
                                    <div className="w-full font-mono text-sm">
                                        {/* 1. THEAD REPLACEMENT */}
                                        <div className="flex bg-white/5 rounded-t-2xl border-x-2 border-t-2 border-white/5">
                                            {
                                                TABLE_HEADERS.creator.subscriptions.map((header, i) => {
                                                    return <div key={i} className="flex-1 px-6  text- py-4.5 font-bold text-lg flex items-center gap-2">
                                                        {/* {header.icon} */}
                                                        {header.title}
                                                    </div>
                                                })
                                            }
                                        </div>

                                        {/* 2. TBODY REPLACEMENT */}
                                        <div className="border-x-2 border-b-2 border-white/5 rounded-b-2xl overflow-hidden">
                                            {filteredData!.map((subscriber, index) => {
                                                const isLast = index === filteredData!.length - 1;
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center transition cursor-pointer hover:bg-white/5 border-t border-white/5 
                                                        ${isLast ? "rounded-b-2xl" : ""}`}
                                                        onClick={() => { setSubscription(subscriber); setOpenDetails(true) }}
                                                    >
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {subscriber.payer?.toString().slice(0, 10)}...
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {subscriber.tierName}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4  text-gray-400 flex items-end gap-2">
                                                            <StatusBadge
                                                                active={subscriber.autoRenew}
                                                                label={subscriber.autoRenew ? "Enabled" : "Disabled"}
                                                            />
                                                        </div>
                                                        <div className="flex-1 px-6 py-4  text-gray-400 flex items-end gap-2">
                                                            <StatusBadge
                                                                active={subscriber.active}
                                                                label={subscriber.active ? "Active" : "Inactive"}
                                                            />
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl text-gray-400 ">
                                                            {formatPeriod(subscriber?.nextPaymentTs!)}
                                                        </div>
                                                        {/* <div className="flex-1 px-6 py-4 text-xl text-gray-400">
                                                            {tx.status == 'success' ? <span className='flex gap-2 items-center' >
                                                                <CircleCheck />
                                                                Succeed
                                                            </span> :
                                                                <span className='flex gap-2 items-center'>
                                                                    <CircleCheck />
                                                                    Failed
                                                                </span>}
                                                        </div> */}
                                                        {/* <div className="px-6 py-2 text-xl flex items-center gap-3 flex-1">
                                                            {
                                                                tx.status == 'success' ? <button className='flex gap-1 items-center pr-3 text-blue-400 hover:text-blue-500 cursor-pointer' onClick={() =>
                                                                    window.open(
                                                                        `https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`,
                                                                        "_blank",
                                                                        "noopener,noreferrer"
                                                                    )}>
                                                                    <ArrowUpRight className='size-5' />
                                                                    Verify
                                                                </button> :
                                                                    <button className='flex gap-1  hover:text-blue-500 items-center pr-3 cursor-pointer text-blue-400' onClick={() => renewSubscription.mutate({ subscriptionPda: tx.subscriptionPda })}>
                                                                        {
                                                                            (renewSubscription.variables?.subscriptionPda == tx.subscriptionPda && renewSubscription.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
                                                                                <RotateCw className='size-5' />                                                                    Retry
                                                                            </div>
                                                                        }
                                                                    </button>
                                                            }
                                                        </div> */}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No subscribers found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>

            <SubscriptionDetails isOpen={openDetails!} setPlanDetailsOpen={setOpenDetails}
                subscription={subscription!} onClose={() => setOpenDetails(false)} isCreator={true} />

        </div >
    )
}

export default page
"use client"

import { useProgram } from '@/app/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import * as anchor from "@coral-xyz/anchor"
import { useEffect, useMemo, useState } from 'react';
import { CircleDot, EyeIcon, Logs, MousePointerClick, Repeat2, User } from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Error from '@/app/components/ui/Error';
import Loader from '@/app/components/ui/Loader';
import TableHeaders from '@/app/components/ui/TableHeaders';
import SubscriptionDetails from '@/app/components/ui/SubscriptionDetails';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Subscription } from '@/app/types';

const page = () => {
    const { publicKey, PROGRAM_ID } = useProgram()
    const { fetchSubscriptionsByPlan } = useProgramActions()
    const [planPDA, setPlanPDA] = useState<PublicKey>()
    const [subscription, setSubscription] = useState<{ publicKey: PublicKey, account: Subscription }>()
    const [currentTier, setTier] = useState()
    const [searchQuery, setSearchQuery] = useState<string | null>("")
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
    console.log("subscribers", subscribers)

    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return subscribers;
        }
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return subscribers?.filter(subscriber => {
            return (
                subscriber.account.payer.toString().includes(lowerCaseQuery) || subscriber.account.tierName.toString().includes(lowerCaseQuery));
        });
    }, [subscribers, searchQuery]);

    const headers = [
        {
            icon: (
                <User />
            ),
            title: "Payer"
        },
        {
            icon: (
                <Logs />
            ),
            title: "Tier"
        },
        {
            icon: (
                <Repeat2 />
            ),
            title: "Auto Renew"
        },
        {
            icon: (
                <CircleDot />
            ),
            title: "Status"
        },
        {
            icon: (
                <MousePointerClick />
            ),
            title: "Actions"
        },
    ]
    console.log(currentTier)
    return (
        <div className='space-y-4 font-mono'>
            <Header title="Subscriptions" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <div className=''>
                {isLoading || isFetching ? (
                    <Loader />
                ) :
                    isQueryError ? <Error refetch={refetch} /> :
                        (filteredData?.length != 0) ?
                            <>
                                <div className="relative overflow-x-auto shadow-xs rounded-lg ">
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={headers} />
                                        <tbody>
                                            {filteredData?.map((subscriber, index) => {
                                                return (
                                                    <tr className="border-t-0 border-2  border-white/5"
                                                    >
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {subscriber.account.payer?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-gray-400">
                                                            {subscriber.account.tierName}
                                                        </td>

                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {subscriber.account.autoRenew ? "Active" : "Disabled"}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {subscriber.account.active ? "Active" : "Disabled"}
                                                        </td>
                                                        <td className='px-6 py-2 text-xl text-gray-400'>
                                                            <button className='flex gap-2  hover:text-blue-500  border-white/8 items-center  cursor-pointer text-blue-400 ' onClick={() => { setSubscription(subscriber); setOpenDetails(true) }}>
                                                                <EyeIcon className='size-5' />                                                                    View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
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
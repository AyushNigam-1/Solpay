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
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={TABLE_HEADERS.creator.subscriptions} />
                                        <tbody>
                                            {filteredData?.map((subscriber) => {
                                                return (
                                                    <tr className="border-t-0 border-2  border-white/5"
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
                                                        {/* <td className='px-6 py-2 text-xl text-gray-400'>
                                                            <button className='flex gap-2  hover:text-blue-500  border-white/8 items-center  cursor-pointer text-blue-400 ' onClick={() => { setSubscription(subscriber); setOpenDetails(true) }}>
                                                                <EyeIcon className='size-6' />                                                                    View
                                                            </button>
                                                        </td> */}
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
const StatusBadge = ({ active, label }: { active: boolean, label?: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full  font-medium border ${active
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : "bg-gray-500/10 text-gray-400 border-gray-500/20"
        }`}>
        {active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {label || (active ? "Active" : "Inactive")}
    </span>
);
export default page
"use client"

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, Subscription } from '@/app/types';
import { PublicKey } from '@solana/web3.js';
import { formatDuration } from '@/app/utils/duration';
import { Banknote, Calendar, EyeIcon, Pointer } from 'lucide-react';
import { TABLE_HEADERS } from '@/app/utils/headers';
import SubscriptionDetails from '@/app/components/ui/modals/SubscriptionDetails';
import Header from '@/app/components/ui/layout/Header';
import TableHeaders from '@/app/components/ui/layout/TableHeaders';
import Loader from '@/app/components/ui/extras/Loader';
import Error from '@/app/components/ui/extras/Error';
import PlanDetails from '@/app/components/ui/modals/PlanDetails';
import { useSearch } from '@/app/hooks/useSearch';
import { StatusBadge } from '@/app/components/ui/layout/StatusBadge';

const page = () => {
    const [subscription, setSubscription] = useState<Subscription & { publicKey: PublicKey }>();
    const [openDetails, setOpenDetails] = useState<boolean>(false)
    const [isPlanDetailsOpen, setPlanDetailsOpen] = useState<boolean>(false)
    const [plan, setPlan] = useState<Plan>()
    const [planPDA, setPlanPDA] = useState<PublicKey | null>()
    const { fetchUserSubscriptions } = useProgramActions();

    const {
        data: subscriptions,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<{ account: Subscription; publicKey: PublicKey; }[]>({
        queryKey: ["userSubscriptions"],
        queryFn: () => fetchUserSubscriptions(),
        staleTime: 1000 * 3000,
    });

    const { searchQuery, setSearchQuery, filteredData } = useSearch(
        subscriptions?.map((subscription) => ({
            ...subscription.account,
            publicKey: subscription.publicKey
        })),
        ['name', 'tierName']
    );
    return (
        <div className='space-y-4 font-mono' >
            <Header title="Subscriptions" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <div className=''>
                {isLoading || isFetching ? (
                    <Loader />
                ) :
                    isQueryError ? <Error refetch={refetch} /> :
                        (filteredData?.length != 0) ?
                            <>
                                <div className="relative overflow-x-auto shadow-xs rounded-lg ">
                                    <div className="w-full font-mono text-sm">
                                        {/* 1. THEAD REPLACEMENT */}
                                        <div className="flex bg-white/5 rounded-t-2xl border-x-2 border-t-2 border-white/5">
                                            {
                                                TABLE_HEADERS.user.subscription.map((header) => {
                                                    return <div className="flex-1 px-6 py-4.5 font-bold text-lg flex items-center gap-2">
                                                        {/* {header.icon} */}
                                                        {header.title}
                                                    </div>
                                                })
                                            }
                                        </div>

                                        {/* 2. TBODY REPLACEMENT */}
                                        <div className="border-x-2 border-b-2 border-white/5 rounded-b-2xl overflow-hidden">
                                            {filteredData!.map((subscription, index) => {
                                                const isLast = index === filteredData!.length - 1;
                                                const currentTier = subscription.planMetadata?.tiers.find(
                                                    (tier) => tier.tierName == subscription.tierName
                                                );

                                                return (
                                                    <div
                                                        key={subscription.bump}
                                                        onClick={() => { setSubscription(subscription); setOpenDetails(true); }}
                                                        className={`flex items-center transition cursor-pointer hover:bg-white/5 border-t border-white/5 
                                                        ${isLast ? "rounded-b-2xl" : ""}`}
                                                    >
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {subscription.planMetadata?.name}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {subscription.tierName}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl text-gray-400 flex items-end gap-2">
                                                            {currentTier?.amount.toString()} {subscription.planMetadata?.tokenSymbol}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl text-gray-400 flex items-end gap-2">
                                                            {formatDuration(currentTier?.periodSeconds!)}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4  text-gray-400">
                                                            <StatusBadge
                                                                active={subscription.active}
                                                                label={subscription.active ? "Active" : "Inactive"}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No active subcriptions found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium">No Subscriptions found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>

            <SubscriptionDetails isOpen={openDetails!} setPlanDetailsOpen={setPlanDetailsOpen}
                setPlan={setPlan} subscription={subscription!} onClose={() => setOpenDetails(false)} isCreator={false} />

            <PlanDetails plan={plan!} planPDA={planPDA!} open={isPlanDetailsOpen} setOpen={setPlanDetailsOpen} type="update" subscriptionPDA={subscription?.publicKey!} subscriptionPayer={subscription?.payer} />
            {/* <ToastContainer position="top-center" transition={Slide} theme='dark' /> */}

        </div>
    )
}

export default page
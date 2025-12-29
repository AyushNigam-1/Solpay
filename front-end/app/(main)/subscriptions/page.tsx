"use client"

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, Subscription } from '@/app/types';
import Header from '@/app/components/ui/Header';
import TableHeaders from '@/app/components/ui/TableHeaders';
import Loader from '@/app/components/ui/Loader';
import Error from '@/app/components/ui/Error';
import { SubscriptionForm } from '@/app/components/ui/SubscriptionForm';
import { PublicKey } from '@solana/web3.js';
import { formatPeriod } from '@/app/utils/duration';
import { Banknote, Building, ChartNoAxesGantt, CircleDot, Coins, Timer } from 'lucide-react';
import SubscriptionDetails from '@/app/components/ui/SubscriptionDetails';
import PlanDetails from '@/app/components/ui/PlanDetails';

const page = () => {
    const [isOpen, setOpen] = useState<boolean>(false)
    const [subscription, setSubscription] = useState<{ account: Subscription; publicKey: PublicKey; }>()
    const [openDetails, setOpenDetails] = useState<boolean>(false)
    const [isPlanDetailsOpen, setPlanDetailsOpen] = useState<boolean>(false)
    // const [openDetails, setOpenDetails] = useState<boolean>(false)
    // const { publicKey } = useProgram()
    const [plan, setPlan] = useState<Plan>()
    const [planPDA, setPlanPDA] = useState<PublicKey | null>()
    // const publicKey = new PublicKey(Cookies.get("user")!)
    const [searchQuery, setSearchQuery] = useState<string | null>("")
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupAction, setPopupAction] = useState<"fund" | "withdraw">("fund");
    const { cancelSubscription, fetchUserSubscriptions } = useProgramActions();

    const {
        data: subscriptions,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<{ account: Subscription; publicKey: PublicKey; }[]>({
        queryKey: ["AllSubscriptions"],
        queryFn: () => fetchUserSubscriptions(),
        staleTime: 1000 * 3000,
    });

    console.log("subscriptions", subscriptions)
    // const {
    //     data: tokens,
    //     // isLoading,
    //     // isFetching,
    //     isError,
    //     error,
    //     // refetch,
    // } = useQuery({
    //     queryKey: ['userTokens', publicKey!.toString()],
    //     queryFn: () => fetchUserTokenAccounts(new PublicKey(publicKey!)),
    //     enabled: !!publicKey!.toString(),
    //     staleTime: 1000 * 3000,
    // });
    // console.log(tokens)

    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return subscriptions;
        }
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return subscriptions?.filter(subscription => {
            return (
                subscription.account.tierName.toString().includes(lowerCaseQuery) ||
                subscription.account.name.toString().includes(lowerCaseQuery)
            );
        });
    }, [subscriptions, searchQuery]);

    const headers = [
        {
            icon: (
                <Building size={20} />
            ),
            title: "Company"
        },
        {
            icon: (
                <ChartNoAxesGantt />
            ),
            title: "Plan"
        },
        {
            icon: (
                <Coins />
            ),
            title: "Token"
        },
        {
            icon: (
                <Banknote />
            ),
            title: "Amount"
        },
        {
            icon: (
                <Timer />
            ),
            title: "Duration"
        },
        {
            icon: (
                <CircleDot />
            ),
            title: "Status"
        },
    ]


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
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={headers} />
                                        <tbody>
                                            {filteredData!.map((subscription) => {
                                                const currentTier = subscription.account.planMetadata?.tiers.find((tier) => tier.tierName == subscription.account.tierName)
                                                return (
                                                    <tr key={subscription.account.bump} className="border-t-0 border-2  border-white/5 transition hover:bg-white/5 cursor-pointer" onClick={() => { setSubscription(subscription); setOpenDetails(true) }}>
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {subscription.account.planMetadata?.name}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {subscription.account.tierName}
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                <img
                                                                    src={subscription.account.planMetadata?.tokenImage}
                                                                    className='w-6 rounded-full object-cover'
                                                                    alt={`${subscription.account.planMetadata?.tokenImage} icon`}
                                                                />
                                                                <p className="text-xl text-gray-400">
                                                                    {subscription.account.planMetadata?.tokenSymbol}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {currentTier?.amount.toString()}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {formatPeriod(currentTier!.periodSeconds!)}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {subscription.account.active ? "Active" : "Disabled"}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
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
            <SubscriptionForm isOpen={isOpen} onClose={() => setOpen(false)} />

            <SubscriptionDetails isOpen={openDetails!} setPlanDetailsOpen={setPlanDetailsOpen}
                setPlan={setPlan} subscription={subscription!} onClose={() => setOpenDetails(false)} />

            <PlanDetails plan={plan!} planPDA={planPDA!} open={isPlanDetailsOpen} setOpen={setPlanDetailsOpen} type="update" subscriptionPDA={subscription?.publicKey!} subscriptionPayer={subscription?.account.payer} />
            {/* <ToastContainer position="top-center" transition={Slide} theme='dark' /> */}

        </div>
    )
}

export default page
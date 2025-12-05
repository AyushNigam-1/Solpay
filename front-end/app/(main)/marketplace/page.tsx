"use client"

import Error from '@/app/components/ui/Error';
import Header from '@/app/components/ui/Header';
import Loader from '@/app/components/ui/Loader';
import PlanDetails from '@/app/components/ui/PlanDetails';
import PlanForm from '@/app/components/ui/PlanForm';
import TableHeaders from '@/app/components/ui/TableHeaders';
import { useProgram } from '@/app/hooks/useProgram';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, planQuery } from '@/app/types';
import { useQuery } from '@tanstack/react-query';
import { CircleUserRound, Coins, Delete, Home, LogIn, Logs, MousePointerClick, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

const page = () => {

    const [searchQuery, setSearchQuery] = useState<string | null>("")
    const [isOpen, setOpen] = useState<boolean>(false)
    const [openDetails, setOpenDetails] = useState<boolean>(false)
    const { publicKey } = useProgram()
    const [plan, setPlan] = useState<Plan>()

    const { fetchAllSubscriptionPlans, cancelPlan } = useProgramActions();

    const {
        data: plans,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<planQuery[]>({
        queryKey: ["AllPlans"],
        queryFn: () => fetchAllSubscriptionPlans(),
        staleTime: 1000 * 3000,
    });

    const headers: any = [
        {
            icon: (
                <CircleUserRound />
            ),
            title: "Creator"
        },
        {
            icon: (
                <Home />
            ),
            title: "Address"
        },
        {
            icon: (
                <Coins />
            ),
            title: "Token"
        },
        {
            icon: (
                <Logs />
            ),
            title: "Tiers"
        },
        // {
        //     icon: (
        //         // <Wallet />
        //     ),
        //     title: "Balance"
        // },
        // {
        //     icon: (
        //         <Timer />
        //     ),
        //     title: "Duration"
        // },
        {
            icon: (
                <MousePointerClick />
            ),
            title: "Action"
        },
    ]
    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return plans;
        }
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return plans?.filter(plan => {
            return (
                plan.account.name.toString().includes(lowerCaseQuery)
                // ||
                //    subscription.account.amount.toString().includes(lowerCaseQuery)
            );
        });
    }, [plans, searchQuery]);

    return (
        <div className='space-y-4 font-mono'>
            <Header title="Marketplace" setOpen={setOpen} refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
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
                                            {filteredData!.map((plan) => {
                                                return (
                                                    <tr key={plan.account.bump} className="border-t-0 border-2  border-white/5"
                                                    //  onClick={() => { setSubscription(subscription.account); setOpenDetails(true) }}
                                                    >
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {plan.account.name}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {plan.account.creator?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                <img
                                                                    src={plan.account.tokenImage}
                                                                    className='w-6 rounded-full object-cover'
                                                                // alt={`${subscription.account.tokenMetadata.symbol} icon`}
                                                                />
                                                                <p className="text-xl text-gray-400">
                                                                    {plan.account.tokenSymbol}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {plan.account.tiers.length}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl ">
                                                            {
                                                                plan.account.creator == publicKey ? <button className='flex gap-2 items-center text-red-400' onClick={() => cancelPlan(plan.account.creator!)}>
                                                                    <Delete />
                                                                    Delete
                                                                </button> : <button className='flex gap-2 items-center hover:text-blue-500 cursor-pointer text-blue-400' onClick={() => { setPlan(plan.account); setOpenDetails(true) }}>
                                                                    <Zap className="w-5 h-5 " />
                                                                    Subscribe
                                                                </button>
                                                            }

                                                            {/* {subscription.account.active ? "Active" : "Disabled"} */}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No active plans found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
            <PlanForm isOpen={isOpen} setIsOpen={setOpen} />
            {/* <SubscriptionForm isOpen={isOpen} onClose={() => setOpen(false)} /> */}
            <PlanDetails plan={plan!} open={openDetails} setOpen={setOpenDetails} />
        </div>
    )
}

export default page
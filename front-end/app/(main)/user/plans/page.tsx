"use client"

import Error from '@/app/components/ui/Error';
import Header from '@/app/components/ui/Header';
import Loader from '@/app/components/ui/Loader';
import PlanDetails from '@/app/components/ui/PlanDetails';
import PlanForm from '@/app/components/ui/PlanForm';
import TableHeaders from '@/app/components/ui/TableHeaders';
import { useMutations } from '@/app/hooks/useMutations';
import { useProgram } from '@/app/hooks/useProgram';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, planQuery } from '@/app/types';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesGantt, Coins, EyeIcon, Logs, MousePointerClick, Trash, UserPlus, UserStar, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

const page = () => {

    const [searchQuery, setSearchQuery] = useState<string | null>("")
    const [isOpen, setOpen] = useState<boolean>(false)
    const [openDetails, setOpenDetails] = useState<boolean>(false)
    const { publicKey } = useProgram()
    const [plan, setPlan] = useState<Plan>()
    const [planPDA, setPlanPDA] = useState<PublicKey | null>()

    const { fetchAllSubscriptionPlans, } = useProgramActions();
    const { cancelPlan } = useMutations()

    const {
        data: plans,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<planQuery[]>({
        queryKey: ["plans"],
        queryFn: () => fetchAllSubscriptionPlans(),
        staleTime: 1000 * 3000,
    });

    const headers: any = [
        {
            icon: (
                <ChartNoAxesGantt />
            ),
            title: "Plan"
        },
        {
            icon: (
                <UserPlus />),
            title: "Creator"
        },
        {
            icon: (
                <UserStar />),
            title: "Reciever"
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
            <Header title="Plans" setOpen={setOpen} refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
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
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {plan.account.receiver?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                <img
                                                                    src={plan.account.tokenImage}
                                                                    className='w-6 rounded-full object-cover'
                                                                    alt={`${plan.account.tokenSymbol} icon`}
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
                                                                plan.account.creator?.toString() == publicKey ? <button className=' text-red-400' onClick={() => cancelPlan.mutate(plan.account.creator!)}>
                                                                    {
                                                                        cancelPlan.isPending && cancelPlan.variables?.toString() == plan.account.creator ? <Loader /> : <span className='flex gap-2 items-center' >
                                                                            <Trash className='size-5' />
                                                                            Delete
                                                                        </span>
                                                                    }
                                                                </button> :
                                                                    <td className=' py-2 text-xl text-gray-400'>
                                                                        <button className='flex gap-2  hover:text-blue-500  border-white/8 items-center  cursor-pointer text-blue-400 ' onClick={() => { setPlan(plan.account); setPlanPDA(plan.publicKey); setOpenDetails(true) }}>
                                                                            <EyeIcon className='size-6' />                                                                    View
                                                                        </button>
                                                                    </td>
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
            <PlanDetails plan={plan!} planPDA={planPDA!} open={openDetails} setOpen={setOpenDetails} type="new" />
        </div>
    )
}

export default page
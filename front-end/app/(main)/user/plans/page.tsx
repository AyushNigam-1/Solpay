"use client"

import Error from '@/app/components/ui/extras/Error';
import Header from '@/app/components/ui/layout/Header';
import Loader from '@/app/components/ui/extras/Loader';
import PlanDetails from '@/app/components/ui/modals/PlanDetails';
import PlanForm from '@/app/components/ui/modals/PlanForm';
import TableHeaders from '@/app/components/ui/layout/TableHeaders';
import { useMutations } from '@/app/hooks/useMutations';
import { useProgram } from '@/app/hooks/useProgram';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, planQuery } from '@/app/types';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesGantt, Coins, EyeIcon, Logs, MousePointerClick, Trash, UserPlus, UserStar, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TABLE_HEADERS } from '@/app/utils/headers';
import { useSearch } from '@/app/hooks/useSearch';

const page = () => {

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

    const { searchQuery, setSearchQuery, filteredData } = useSearch(
        plans?.map((plan) => ({
            ...plan.account,
            publicKey: plan.publicKey
        })),
        ['name']
    );

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
                                {/* 1. WRAPPER: Added 'border-b' to the outer container to close the table bottom */}
                                <div className="w-full font-mono text-sm border-2 border-b border-white/5 rounded-2xl overflow-hidden shadow-xs">

                                    {/* HEADER SECTION */}
                                    <div className="flex bg-white/5 border-b border-white/5">
                                        {TABLE_HEADERS.user.plans.map((header, i) => (
                                            <div key={i} className="flex-1 px-6 py-4.5 font-bold text-lg text-white">
                                                {header.title}
                                            </div>
                                        ))}
                                    </div>

                                    {/* BODY SECTION */}
                                    <div className="flex flex-col">
                                        {filteredData!.map((plan, index) => {
                                            const isLast = index == filteredData!.length - 1;

                                            return (
                                                <div
                                                    key={plan.bump}
                                                    onClick={() => {
                                                        setPlan(plan);
                                                        setPlanPDA(plan.publicKey);
                                                        setOpenDetails(true);
                                                    }}

                                                    className={`flex items-center transition cursor-pointer hover:bg-white/5 border-t border-white/5 
                    ${isLast ? "rounded-b-2xl" : ""}`}
                                                >
                                                    <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                        {plan.name}
                                                    </div>

                                                    <div className="flex-1 px-6 py-4 text-xl text-gray-400">
                                                        {plan.creator?.toString().slice(0, 10)}...
                                                    </div>

                                                    <div className="flex-1 px-6 py-4 text-xl text-gray-400">
                                                        {plan.receiver?.toString().slice(0, 10)}...
                                                    </div>

                                                    <div className="flex-1 px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={plan.tokenImage}
                                                                className='w-6 h-6 rounded-full object-cover border border-white/10'
                                                                alt={plan.tokenSymbol}
                                                            />
                                                            <p className="text-xl text-gray-400">{plan.tokenSymbol}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 px-6 py-4 text-xl text-gray-400">
                                                        {plan.tiers.length}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
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
            <PlanDetails plan={plan!} planPDA={planPDA!} open={openDetails} setOpen={setOpenDetails} type="new" />
        </div>
    )
}

export default page
"use client"

import Header from '@/app/components/ui/layout/Header';
import Loader from '@/app/components/ui/extras/Loader';
import PlanForm from '@/app/components/ui/modals/PlanForm';
import { useMutations } from '@/app/hooks/useMutations';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Tier } from '@/app/types';
import { formatDuration } from '@/app/utils/duration';
import { useQuery } from '@tanstack/react-query';
import {
    Banknote, Calendar, ChartNoAxesGantt, Coins, CreditCard,
    Edit, PlusCircle, Trash, UserPlus, Users, Copy, ExternalLink,
    MoreHorizontal,
    UserStar
} from 'lucide-react';
import { useState } from 'react';

const Page = () => {
    const { getMyPlan } = useProgramActions();
    const { cancelPlan } = useMutations()
    const [isOpen, setOpen] = useState<boolean>(false)
    const [copied, setCopied] = useState(false);

    const {
        data: plan,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["my-plan"],
        queryFn: async () => await getMyPlan(),
        staleTime: 1000 * 3000,
    });

    const copyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString: string) => {
        // Assuming dateString is parseable, or use current date if static
        return new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading) return <div className="space-y-4 font-mono"><Header isFetching={isFetching} refetch={refetch} title='Plan' /><Loader /></div>;

    return (
        <div className='space-y-4 font-mono text-gray-100'>
            <Header isFetching={isFetching} refetch={refetch} title='Plan' />

            {plan ? (
                <div className='w-full overflow-hidden shadow-xl space-y-4'>

                    {/* --- Top Bar: Title & Actions --- */}
                    <div className="flex justify-between items-center ">
                        <div className="flex items-center gap-3">
                            {/* <div className='p-3 rounded-xl bg-blue-500/10 text-blue-400'>
                                <ChartNoAxesGantt size={24} />
                            </div> */}
                            <div>
                                <h2 className='text-2xl font-bold text-white tracking-tight'>{plan?.name}</h2>
                                {/* <p className='text-sm text-gray-500 font-mono'>Plan ID: {plan?.name.toUpperCase().slice(0, 8)}</p> */}
                            </div>
                        </div>

                        {/* Moved Actions to Top Right */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setOpen(true)}
                                className="p-2.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                title="Edit Plan"
                            >
                                <Edit size={20} />
                            </button>
                            <button
                                onClick={() => cancelPlan.mutate(plan.creator!)}
                                disabled={cancelPlan.isPending}
                                className="p-2.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete Plan"
                            >
                                {cancelPlan.isPending ? <Loader /> : <Trash size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">

                        {/* --- Hero Stats (KPIs) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Revenue */}
                            <div className='bg-white/5 rounded-2xl p-6 flex justify-between items-center'>

                                <div className='flex flex-col gap-2 relative z-10'>
                                    <span className="text-gray-400 font-medium flex items-center gap-2">
                                        <Banknote size={16} />
                                        Total Revenue
                                    </span>
                                    <span className='text-4xl font-extrabold text-white mt-1'>
                                        1K
                                        <span className="text-2xl text-gray-400 font-medium"> OPOS</span>
                                    </span>
                                    <span className=" text-gray-500 ">≈ $450.00 USD</span>
                                </div>
                                <div className="opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Banknote size={80} />
                                </div>
                            </div>

                            <div className='bg-white/5 rounded-2xl p-6 flex justify-between items-center'>
                                <div className='flex flex-col gap-1 relative z-10'>
                                    <span className="text-gray-400 font-medium flex items-center gap-2">
                                        <Users size={16} />

                                        Active Subscribers
                                    </span>
                                    <span className='text-4xl font-extrabold text-white mt-1'>
                                        22
                                    </span>
                                    <span className="text-gray-500">
                                        +4 this week
                                    </span>
                                </div>
                                <div className="opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users size={80} />
                                </div>
                            </div>
                        </div>

                        {/* --- Secondary Details Grid --- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Address Card */}
                            <div className='bg-white/5 rounded-xl p-4 flex flex-col gap-2'>
                                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Receiver Wallet</span>
                                <div className="flex items-center gap-3 h-full">
                                    <UserStar className="text-gray-600" size={20} />
                                    <span className='font-mono font-medium text-gray-200'>
                                        {plan?.creator.toBase58().slice(0, 5)}...{plan?.creator.toBase58().slice(-5)}
                                    </span>
                                </div>
                            </div>

                            <div className='bg-white/5 rounded-xl p-4 flex flex-col gap-2'>
                                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Token Name</span>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={plan?.tokenImage || "https://placehold.co/40x40/black/white?text=T"}
                                        className='w-10 h-10 rounded-full object-cover ring-2 ring-white/10'
                                        alt="Token"
                                    />
                                    <div>
                                        <div className="font-bold text-white">{plan?.tokenSymbol}</div>
                                        <div className="text-xs text-gray-500">SPL Token</div>
                                    </div>
                                </div>
                            </div>

                            {/* Date Card */}
                            <div className='bg-white/5 rounded-xl p-4 flex flex-col gap-2'>
                                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Published On</span>
                                <div className="flex items-center gap-3 h-full">
                                    <Calendar className="text-gray-600" size={20} />
                                    <span className='font-medium text-gray-200'>
                                        {formatDate("2025-12-12")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className='h-px w-full bg-white/5' />

                        {/* --- Tiers Section --- */}
                        <div className="flex justify-between">
                            <h3 className="text-xl font-bold text-gray-200">Subscription Tiers</h3>
                            <span className="text-sm text-gray-500">{plan?.tiers?.length || 0} Active Tiers</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Render Active Tiers */}
                            {plan?.tiers?.map((tier: Tier, index: number) => (
                                <div
                                    key={index}
                                    className=" rounded-2xl p-5 bg-white/5 transition-all duration-300 flex flex-col h-full justify-between space-y-3"
                                >
                                    <h4 className="text-xl font-bold text-white truncate pr-6">{tier.tierName}</h4>
                                    <p className="text-gray-400 ">
                                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Laborum a labore ratione sunt voluptatum Lorem ipsum dolor sit amet consectetur adipisicing elit. Harum, facere? Lorem Lorem ipsum dolor sit.
                                    </p>
                                    <div className='h-0.5 w-full bg-white/5' />

                                    <div className="flex items-baseline justify-between">
                                        <div className="flex items-baseline gap-1">
                                            <span className='text-3xl font-bold text-white'>{tier.amount as number}</span>
                                            <span className=" font-medium text-gray-500">{plan?.tokenSymbol}</span>
                                        </div>
                                        <div className="text-sm font-medium text-blue-400 mt-1">
                                            {formatDuration(tier.periodSeconds)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(plan?.tiers?.length || 0) < 5 && (
                                <button
                                    onClick={() => {/* Logic to add tier */ }}
                                    className="group h-full min-h-[250px] rounded-2xl border border-dashed border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/20 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer text-gray-500 hover:text-blue-400"
                                >
                                    <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                                        <PlusCircle size={32} />
                                    </div>
                                    <span className="font-medium">Add New Tier</span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            ) : (
                /* Empty State */
                <div className='flex flex-col justify-center gap-6 items-center w-full h-[82vh] '>
                    <div className="p-6 bg-white/5 rounded-full">
                        <CreditCard className='text-gray-500' size={48} />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className='text-2xl font-bold text-white'>No Plans Configured</h2>
                        <p className="text-gray-400 max-w-sm">Create your first subscription plan to start accepting recurring payments on Solana.</p>
                    </div>
                    <button
                        onClick={() => setOpen(true)}
                        disabled={isFetching}
                        className="py-3 px-6 flex items-center gap-2 rounded-xl text-white font-semibold transition-all transform bg-blue-400/75 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                    >
                        <PlusCircle size={20} />
                        Create New Plan
                    </button>
                </div>
            )}

            <PlanForm isOpen={isOpen} setIsOpen={setOpen} plan={plan} />
        </div>
    )
}

export default Page
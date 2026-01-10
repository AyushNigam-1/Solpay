"use client"

import Header from '@/app/components/ui/layout/Header';
import Loader from '@/app/components/ui/extras/Loader';
import PlanForm from '@/app/components/ui/modals/PlanForm';
import { useMutations } from '@/app/hooks/useMutations';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Tier } from '@/app/types';
import { formatDuration } from '@/app/utils/duration';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Calendar, ChartNoAxesGantt, Coins, CreditCard, Edit, PlusCircle, Trash, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

const page = () => {
    const { getMyPlan } = useProgramActions();
    const { cancelPlan } = useMutations()
    const [isOpen, setOpen] = useState<boolean>(false)

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

    return (
        <div className='space-y-4 font-mono'>
            <Header isFetching={isFetching} refetch={refetch} title='Plan' />
            {isLoading ? <Loader /> : plan ?
                <div className='w-full p-4 pt-4.5 bg-white/5  transform overflow-hidden  rounded-2xl  text-left align-middle  transition-all font-inter text-white relative  space-y-4.5' >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                        <div className=' bg-white/5 rounded-xl  w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400 ">Plan Name</span>
                                <span className='truncate font-bold text-xl'>
                                    {plan?.name}
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <ChartNoAxesGantt />
                            </span>
                        </div>
                        <div className=' bg-white/5 rounded-xl  w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400 ">Receiver Address</span>
                                <span className='truncate font-bold text-xl'>
                                    {plan?.creator.toBase58().slice(0, 10)}...
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <UserPlus />
                            </span>
                        </div>
                        <div className=' bg-white/5 rounded-xl  w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400 ">Token Name</span>
                                <div className="flex items-end gap-2 font-bold text-xl">
                                    <img
                                        src={plan?.tokenImage}
                                        className='w-6 rounded-full object-cover'
                                        alt={`${plan?.tokenSymbol} icon`}
                                    />
                                    {plan?.tokenSymbol}
                                </div>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Coins />
                            </span>
                        </div>
                        <div className='bg-white/5 rounded-xl w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400"> Subscribers Count  </span>
                                <span className='truncate font-bold text-xl'>
                                    {/* {plan?.mint.toBase58()} */} 22
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Users />
                            </span>
                        </div>
                        <div className=' bg-white/5 rounded-xl  w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400 "> Total Revenue</span>
                                <span className='truncate font-bold text-xl'>
                                    {/* {plan?.mint.toBase58()} */} 1k OPOS
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Banknote />
                            </span>
                        </div>
                        <div className=' bg-white/5 rounded-xl  w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400 "> Published On</span>
                                <span className='truncate font-bold text-xl'>
                                    12/12/2025
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Calendar />
                            </span>
                        </div>
                    </div>
                    <div className='h-0.5 w-full bg-white/5' />
                    <h2 className="text-2xl font-extrabold text-gray-200 tracking-tight truncate ">Tiers</h2>
                    {/* Content Section */}
                    <div className="max-h-[70vh]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                            {
                                plan?.tiers && plan?.tiers.length > 0
                                    ? (
                                        plan?.tiers.map((tier: Tier, index: number) => {
                                            return (
                                                <div
                                                    key={index}
                                                    className={`relative cursor-pointer rounded-2xl p-4 bg-white/5 transition-all duration-200 group flex flex-col justify-between space-y-3
                                                `}
                                                >
                                                    <div className='space-y-3'>
                                                        <h4 className="text-2xl font-bold text-white">{tier.tierName}</h4>
                                                        <p className="text-gray-400 text-md">
                                                            {/* {tier.description || "Standard subscription tier."} */}
                                                            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum a labore ratione sunt voluptatum rerum maxime modi, odio id excepturi consequuntur doloribus repellendus odio id excepturi consequuntur doloribus repellendus
                                                            doloribus
                                                        </p>
                                                    </div>
                                                    <div className='flex flex-col gap-3'>
                                                        <div className='h-0.5 w-full bg-white/5 flex' />
                                                        <div className="flex flex-col items-baseline gap-1">
                                                            <div className=" flex gap-1 items-end ">
                                                                {/* Displaying stringified amount */}
                                                                <span className='text-3xl font-bold text-white'>
                                                                    {tier.amount as number}
                                                                </span>
                                                                <span className=" font-medium text-gray-400">{plan?.tokenSymbol}</span>
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-300 ">
                                                                Every {formatDuration(tier.periodSeconds)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-center py-10 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
                                            No subscription tiers available for this plan?.
                                        </div>
                                    )}
                            {
                                plan?.tiers?.length < 4 && plan?.tiers?.length >= 1 &&
                                Array(5 - plan?.tiers?.length).fill(null)
                                    .map((_, index) => {
                                        return (<div key={index} className="w-full h-full bg-white/5 rounded-2xl flex justify-center items-center">
                                            <div className="p-4 rounded-full bg-white/5">
                                                <PlusCircle size={45} />
                                            </div>
                                        </div>)
                                    })
                            }
                        </div>
                        {/* Footer / Subscribe Action */}
                    </div>
                    <div className='h-0.5 w-full bg-white/5' />
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => setOpen(true)}
                            className={`text-blue-400 text-center group flex justify-center text-xl items-center gap-3 py-4 px-6 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                            <Edit className="size-5" />
                            Edit
                        </button>
                        <button
                            onClick={() => cancelPlan.mutate(plan.creator!)}
                            className={`${cancelPlan.isPending ? "text-gray-700" : "  text-red-400"} text-center group flex justify-center text-xl items-center gap-3 py-4 px-6 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                            {
                                cancelPlan.isPending ? <Loader /> :
                                    <Trash className="size-5" />
                            }
                            Delete
                        </button>
                    </div>
                </div>
                : <div className='flex flex-col justify-center gap-4 items-center w-full h-[calc(100vh-200px)]'>
                    <CreditCard className='text-gray-200' size={50} />
                    <h2 className='text-3xl font-semibold text-gray-200'>No plans configured</h2>
                    <p className="text-lg text-gray-400">Create a plan to start accepting subscriptions</p>
                    <button
                        onClick={() => setOpen(true)}
                        disabled={isFetching}
                        className={` py-2 px-4 flex items-center gap-2 rounded-lg text-white transition-all transform hover:scale-[1.01] bg-blue-400 hover:bg-blue-500 cursor-pointer`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        New Plan
                    </button>
                </div>
            }
            <PlanForm isOpen={isOpen} setIsOpen={setOpen} plan={plan} />
        </div>
    )
}

export default page
"use client"

import Error from '@/app/components/ui/Error';
import Header from '@/app/components/ui/Header';
import Loader from '@/app/components/ui/Loader';
import { useMutations } from '@/app/hooks/useMutations';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Tier } from '@/app/types';
import { formatDuration } from '@/app/utils/duration';
import { useQuery } from '@tanstack/react-query';
import { Banknote, ChartNoAxesGantt, Check, CheckCircle2, Coins, Edit, Logs, MousePointerClick, PlusCircle, Trash, UserPlus, Users, UserStar, X, Zap } from 'lucide-react';

const page = () => {
    const { getMyPlan } = useProgramActions();
    const { cancelPlan } = useMutations()

    const {
        data: plan,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery({
        queryKey: ["plan?"],
        queryFn: async () => await getMyPlan(),
        staleTime: 1000 * 3000,
    });

    console.log("plan?", plan)

    // const headers = [
    //     {
    //         icon: (
    //             <ChartNoAxesGantt />
    //         ),
    //         title: "Plan"
    //     },
    //     {
    //         icon: (
    //             <UserStar />),
    //         title: "Reciever"
    //     },

    //     {
    //         icon: (
    //             <Coins />
    //         ),
    //         title: "Token"
    //     },
    //     {
    //         icon: (
    //             <Logs />
    //         ),
    //         title: "Tiers"
    //     },
    //     {
    //         icon: (
    //             <MousePointerClick />
    //         ),
    //         title: "Action"
    //     },
    // ]
    const cards = [
        {
            title: "",
            value: "",
            icon: ""
        }

    ]
    return (
        <div className='space-y-4 font-mono'>
            {/* <h2 className='text-2xl font-bold'>Plan</h2> */}
            {/* <Header isFetching={isFetching} refetch={refetch} title='Plan' />
            <div className='h-0.5 w-full bg-white/5' /> */}

            {isLoading ? <Loader /> :
                <div className='w-full p-4 bg-white/5  transform overflow-hidden  rounded-2xl  text-left align-middle  transition-all font-inter text-white relative  space-y-4.5' >
                    <div className="flex items-center justify-between">

                        <h2 className="text-3xl font-extrabold text-white tracking-tight truncate">{plan?.name}</h2>
                        <div className='relative' >
                            <button
                                onClick={() => cancelPlan.mutate(plan.account.creator!)}
                                className={`${cancelPlan.isPending ? "text-gray-700" : "  text-blue-400"} text-center group flex  justify-center  items-center gap-3 text-xl  transition cursor-pointer font-semibold`}>
                                {
                                    cancelPlan.isPending ? <Loader /> :
                                        <Edit className="size-5" />
                                }
                                Edit
                            </button>

                        </div>
                    </div>
                    <div className='h-0.5 w-full bg-white/5' />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4.5">

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
                                <span className="hidden sm:inline text-gray-400 ">Token Address</span>
                                <span className='truncate font-bold text-xl'>
                                    {plan?.mint.toBase58().slice(0, 10)}...
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Coins />
                            </span>
                        </div>
                        <div className='bg-white/5 rounded-xl w-full p-2 flex justify-between items-center'>
                            <div className='flex flex-col gap-2'>
                                <span className="hidden sm:inline text-gray-400">Total Subscribers  </span>
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
                                <span className="hidden sm:inline text-gray-400 ">Total Revenue</span>
                                <span className='truncate font-bold text-xl'>
                                    {/* {plan?.mint.toBase58()} */} 1k OPOS
                                </span>
                            </div>
                            <span className='p-4 rounded-full bg-white/5'>
                                <Banknote />
                            </span>
                        </div>
                    </div>
                    <div className='h-0.5 w-full bg-white/5' />
                    <div className="flex justify-between">
                        <h2 className="text-2xl font-extrabold text-gray-200 tracking-tight truncate ">Tiers</h2>
                    </div>

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
                    {/* <div className='h-0.5 w-full bg-white/5' /> */}

                    {/* <div className='h-0.5 w-full bg-white/5' /> */}

                    {/* <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">

</div> */}
                    <div className='h-0.5 w-full bg-white/5' />
                    <div className="flex gap-4 justify-center">

                        <button
                            onClick={() => cancelPlan.mutate(plan.account.creator!)}
                            className={`${cancelPlan.isPending ? "text-gray-700" : "  text-red-400"} text-center group flex justify-center text-xl items-center gap-3 p-4 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                            {
                                cancelPlan.isPending ? <Loader /> :
                                    <Trash className="size-5" />
                            }
                            Delete
                        </button>
                    </div>
                </div>}
        </div>

    )
}

export default page
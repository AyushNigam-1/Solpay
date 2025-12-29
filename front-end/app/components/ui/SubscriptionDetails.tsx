import { PaymentHistory, Plan, StatCardProps, Subscription } from '@/app/types';
import { formatDate, formatPeriod } from '@/app/utils/duration';
import { ArrowUpRight, Ban, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleArrowDown, CircleArrowUp, CircleCheck, CircleDot, Coins, Dot, History, MousePointerClick, Pause, Pen, Play, Repeat2, RotateCw, Route, Timer, Trash, Wallet, X } from 'lucide-react';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import TableHeaders from './TableHeaders';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { useMutations } from '@/app/hooks/useMutations';
import Loader from './Loader';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useProgram } from '@/app/hooks/useProgram';
interface subscriptionDetailsProps {
    isOpen: boolean;
    subscription: { account: Subscription, publicKey: PublicKey }
    setPlanDetailsOpen: Dispatch<SetStateAction<boolean>>
    setPlan: Dispatch<SetStateAction<Plan | undefined>>;
    onClose: () => void;
}

const subscriptionDetails = ({ isOpen, subscription, setPlan, setPlanDetailsOpen, onClose }: subscriptionDetailsProps) => {
    const { deleteSubscription, manageAutoRenew, manageStatus } = useMutations()
    const [autoRenew, setAutoRenew] = useState(subscription?.account.autoRenew)
    const { publicKey } = useProgram()

    const {
        data: transactions,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<PaymentHistory[]>({
        queryKey: ["CompanyTransactions", publicKey, subscription?.account.planMetadata!.name],
        queryFn: async () => {
            const res = await axios.get<PaymentHistory[]>(
                `http://127.0.0.1:3000/api/transactions/${publicKey}/${subscription?.account.planMetadata!.name}`
            );
            return res.data;
        },
        enabled: !!publicKey && !!subscription?.account.planMetadata!.name,
        staleTime: 1000 * 3000,
    });

    useEffect(() => {
        if (subscription?.account?.autoRenew !== undefined) {
            setAutoRenew(subscription.account.autoRenew);
        }
    }, [subscription?.account?.autoRenew]);
    // console.log("subscription?",)
    const currentTier = subscription?.account.planMetadata!.tiers.find((tier) => tier.tierName == subscription?.account.tierName)
    const handleClose = () => {
        // if (!isMutating) {
        onClose();
        setTimeout(() => {
            // setSuccessPDA(null);
            // setFormData(initialFormState);
        }, 300);
    }


    const headers: any = [
        {
            icon: (
                <Calendar size={20} />
            ),
            title: "Date"
        },
        {
            icon: (
                <Coins size={20} />
            ),
            title: "Token"
        },
        {
            icon: (
                <CircleDot size={20} />
            ),
            title: "Status"
        },
        {
            icon: (
                <MousePointerClick />
            ),
            title: "Action"
        },
    ]

    const safeToNumber = (val: any): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return Number(val);
        // Check if it's an Anchor BN (has .toNumber method)
        if (val.toNumber) {
            try {
                return val.toNumber();
            } catch (e) {
                return 0; // Fallback if number is too large for JS Number
            }
        }
        // Check if it has _bn property (internal BN representation)
        if (val._bn) {
            // We can't easily access internal _bn without re-wrapping, 
            // better to assume the parent passes a valid BN or string.
            // Attempting to stringify:
            return Number(val.toString());
        }
        return 0;
    };

    const formatDuration = (val: any) => {
        const seconds = safeToNumber(val);
        if (!seconds) return "Unknown Duration";
        const days = Math.floor(seconds / (3600 * 24));
        if (days >= 30) return `${Math.floor(days / 30)} Month(s)`;
        if (days >= 7) return `${Math.floor(days / 7)} Week(s)`;
        return `${days} Day(s)`;
    };
    // if (!isOpen) return null;

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50 font-mono" onClose={handleClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 scale-90 -translate-y-12"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-12"
                        >
                            <DialogPanel
                                className={`bg-white/5 rounded-3xl text-left align-middle shadow-2xl border border-gray-800 w-full max-w-6xl  p-6 space-y-4 relative`}
                                onClick={(e) => e.stopPropagation()}
                            >

                                <div className=" flex justify-between items-center ">
                                    <div className='flex gap-2' >
                                        <h2 className="text-2xl font-bold text-white ">
                                            {subscription?.account.planMetadata!.name}
                                        </h2>
                                        <div className={`flex p-1 bg-white/5 rounded-lg pr-2 ${subscription?.account.active ? 'text-blue-400' : 'text-red-400'}`} >
                                            <Dot />
                                            {subscription?.account.active ? "Active" : "Deactive"}
                                        </div>
                                        {/* <div className='h-0.5 w-full bg-white/5' /> */}
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition  bg-white/5 p-2 rounded-full">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    {/* <div className='flex gap-4' > */}
                                    {/* <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold' >
                        <History size={20} />
                        Recent Transactions
                    </button> */}


                                    {/* </div> */}
                                </div>
                                {/* <div className='h-0.5 w-full bg-white/5' /> */}
                                {/* <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <div className='flex flex-col gap-2 bg-white/5 p-3 rounded-2xl w-full'>
                        <span className="hidden sm:inline text-gray-400 text-sm">Creator</span>
                        <span className='truncate font-bold'>
                            {subscription?.account.planMetadata.creator.toBase58()}
                        </span>
                    </div>
                    <div className='flex flex-col gap-2 bg-white/5 p-3 rounded-2xl w-full'>
                        <span className="hidden sm:inline text-gray-400 text-sm"> Reciever</span>
                        <span className="truncate font-bold" >
                            {subscription?.account.planMetadata.receiver.toBase58()}
                        </span>
                    </div>
                </div> */}
                                {/* <StatCard title='Created By' value={subscription?.account.planMetadata.creator.toBase58()} icon={Banknote} />
                <StatCard title='Reciever' value={subscription?.account.planMetadata.receiver.toBase58()} icon={Banknote} /> */}

                                <div className='h-0.5 w-full bg-white/5' />
                                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                    <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-3'>
                                        <span className="hidden sm:inline text-gray-400 ">Creator</span>
                                        <span className='truncate font-bold text-lg'>
                                            {subscription?.account.planMetadata!.creator?.toString()}
                                            {/* {processedPlan.creator.slice(0, 20)}...{processedPlan.creator.slice(30)} */}
                                        </span>
                                    </div>
                                    <div className='h-full w-2 bg-white/5' />
                                    <div className='flex flex-col gap-2 w-full bg-white/5 rounded-xl p-3'>
                                        <span className="hidden sm:inline text-gray-400 "> Reciever</span>
                                        <span className="truncate font-bold text-lg" >
                                            {subscription?.account.planMetadata!.receiver.toString()}
                                        </span>
                                    </div>
                                </div>
                                <div className='h-0.5 w-full bg-white/5' />

                                {/* <div className='grid grid-cols-3 gap-4' >
                    <StatCard title='Name' value={currentTier?.tierName} icon={Timer} />
                    <StatCard title='Amount' value={currentTier?.amount.toString()} icon={Banknote} />
                    <StatCard title='Duration' value={formatPeriod(currentTier?.periodSeconds)} icon={Timer} />
                </div>
                <StatCard title='Description' value={currentTier?.description} icon={Banknote} /> */}
                                <div className='grid grid-cols-12 gap-3' >
                                    <div className='space-y-4 col-span-3 rounded-2xl'>
                                        <div className='flex justify-between'>
                                            <h6 className='text-xl font-bold'>Tier</h6>
                                            {/* <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold mb-0'
                                                onClick={() => { setPlan(subscription?.account.planMetadata); setPlanDetailsOpen(true); onClose() }}
                                            >
                                                <Repeat2 />
                                                Change Tier
                                            </button> */}
                                        </div>
                                        {/* <div className='h-0.5 w-full    bg-white/5' /> */}

                                        <div
                                            className={`relative cursor-pointer rounded-2xl max-w-xs  p-4 border-2 transition-all duration-200 group flex flex-col justify-between space-y-3 border-white/5 m-0`}
                                        >
                                            {/* <div className="absolute top-4 right-4 text-blue-400">
                                <CheckCircle2 className="w-6 h-6" />
                            </div> */}
                                            {/* <div className={`p-3 rounded-xl  mb-3 ${isSelected ? 'bg-blue-500/20' : 'bg-gray-700/50 group-hover:bg-gray-700'}`}>
                                                                                    <TierIcon name={tier.tierName} />
                                                                                </div> */}
                                            <div className='space-y-3'>
                                                <h4 className="text-2xl font-bold text-white">{currentTier?.tierName}</h4>
                                                <p className="text-gray-400">{currentTier?.description || "Standard subscription? tier."}  </p>
                                            </div>
                                            <div className='flex flex-col gap-3'>
                                                <div className='h-0.5 w-full bg-white/5 flex' />
                                                <div className="flex flex-col items-baseline gap-1">
                                                    <div className=" flex gap-1 items-end ">
                                                        {/* Displaying stringified amount */}
                                                        <span className='text-3xl font-bold text-white'>
                                                            {currentTier?.amount.toString()}
                                                        </span>
                                                        <span className=" font-medium text-gray-400">{subscription?.account.planMetadata!.tokenSymbol}</span>
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-300 ">
                                                        {/* Every 2 Months */}
                                                        {formatDuration(currentTier?.periodSeconds)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                        </div>
                                    </div>
                                    <div className='col-span-9 flex flex-col gap-4 border-l-2 border-white/5 pl-3 h-full'>
                                        <div className='flex justify-between '>
                                            <h6 className='text-xl font-bold'>Transactions</h6>
                                            <div className='relative' >
                                                {/* <label className="inline-flex items-center cursor-pointer ">
                                                    <input type="checkbox" className="sr-only peer" defaultChecked={subscription?.account.autoRenew}
                                                        onClick={() => manageAutoRenew.mutate({ subscriptionPDA: subscription?.publicKey, field: "autoRenew", value: !subscription?.account.autoRenew, payerKey: subscription?.account.payer })}
                                                    />
                                                    <div className="relative w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md peer-checked:bg-brand">
                                                    </div>
                                                    <span className="select-none ms-2 font-medium text-heading">Auto-Renew</span>
                                                </label> */}
                                                <label className="inline-flex items-center cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={autoRenew}
                                                        onChange={() =>
                                                            // setAutoRenew()
                                                            manageAutoRenew.mutateAsync({
                                                                subscriptionPDA: subscription?.publicKey,
                                                                field: "autoRenew",
                                                                value: !autoRenew,
                                                                payerKey: subscription?.account.payer,
                                                            }).then(() => setAutoRenew(!autoRenew))
                                                        }
                                                    />

                                                    {/* Track */}
                                                    <div className="relative w-11 h-6 rounded-full bg-white/10 group-has-checked:bg-brand transition-colors">
                                                        {/* Thumb */}
                                                        <div
                                                            className="
                                                                absolute top-0.5 left-0.5 h-5 w-5 rounded-full
                                                                flex items-center justify-center
                                                                bg-red-400 text-white
                                                                transition-all duration-300
                                                                group-has-checked:translate-x-5
                                                                group-has-checked:bg-blue-400"
                                                        >
                                                            <span className="group-has-checked:hidden text-xs p-0.5"> {manageAutoRenew.isPending ? <Loader /> : <X size={10} />}</span>
                                                            <span className="hidden group-has-checked:inline text-xs p-0.5">{manageAutoRenew.isPending ? <Loader /> : <Check size={10} />}</span>
                                                        </div>
                                                    </div>

                                                    <span className="ms-2 font-medium text-heading select-none">
                                                        Auto-Renew
                                                    </span>
                                                </label>


                                            </div>
                                            {/* <span className='flex justify-center items-end gap-1 text-lg ' >
                                                <h6 className='text-gray-400'>
                                                    Bal:
                                                </h6>
                                                <h4 className='font-semibold text-blue-400'>
                                                    {subscription?.account.prefundedAmount.toString()} {subscription?.account.planMetadata.tokenSymbol}
                                                </h4>
                                                
                                            </span> */}
                                        </div>
                                        <div className="rounded-2xl overflow-hidden border border-white/10">
                                            <table className="w-full table-fixed text-sm text-left rtl:text-right text-body h-full">
                                                <TableHeaders columns={headers} />
                                                <tbody>

                                                    {transactions?.map((tx, index) => {
                                                        const isFirstRow = index === 0;
                                                        const isLastRow = index === transactions?.length - 1;
                                                        return (
                                                            <tr key={subscription?.account.bump} className="transition cursor-pointer border border-white/5 rounded-2xl" >
                                                                <td className={`
                                                    px-6 py-2 text-xl text-gray-400
                                                    ${isFirstRow ? "rounded-tl-2xl" : ""}
                                                    ${isLastRow ? "rounded-bl-2xl" : ""}
                                                `}>
                                                                    {formatDate(tx.createdAt)}
                                                                </td>
                                                                <td className='px-6 py-2 text-xl text-gray-400 '>
                                                                    {tx.amount} OPOS
                                                                </td>

                                                                <td className={`
                                                        px-6 py-2 text-xl text-gray-400
                                                        ${isFirstRow ? "rounded-tr-2xl" : ""}
                                                        ${isLastRow ? "rounded-br-2xl" : ""}
                                                    `}>
                                                                    {tx.status == 'success' ? <span className='flex gap-2 items-center' >
                                                                        <CircleCheck />
                                                                        Success
                                                                    </span> :
                                                                        <span className='flex gap-2 items-center'>
                                                                            <CircleCheck />
                                                                            Failed
                                                                        </span>}
                                                                </td>
                                                                <td className="px-6 py-2 text-xl ">
                                                                    {
                                                                        tx.status == 'success' ? <button className='flex gap-2 items-center text-blue-400 hover:text-blue-500 cursor-pointer' onClick={() =>
                                                                            window.open(
                                                                                `https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`,
                                                                                "_blank",
                                                                                "noopener,noreferrer"
                                                                            )}>
                                                                            <ArrowUpRight className='size-5' />
                                                                            Verify
                                                                        </button> :
                                                                            <button className='flex gap-2 items-center hover:text-blue-500 cursor-pointer text-blue-400' onClick={() => { "" }}>
                                                                                <RotateCw />                                                                    Retry
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
                                        {/* </div> */}
                                    </div>
                                </div>
                                <div className='h-0.5 w-full bg-white/5 flex' />
                                <div className='flex gap-2' >
                                    <button className='text-center group flex w-full justify-center m-auto items-center gap-3 p-4 rounded-xl bg-white/5 text-blue-400 transition cursor-pointer font-semibold'
                                        onClick={() => { setPlan(subscription?.account.planMetadata); setPlanDetailsOpen(true); onClose() }}
                                    >
                                        <Repeat2 />
                                        Change Tier
                                    </button>
                                    <button
                                        onClick={() => manageStatus.mutate({ subscriptionPDA: subscription?.publicKey, field: "active", value: !subscription?.account.active, payerKey: subscription?.account.payer })}
                                        className={` ${manageStatus.isPending ? "text-gray-700" : !subscription?.account.active ? "text-blue-400" : "text-red-400"}  p-4 bg-white/5 w-full flex justify-center items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold`}>
                                        {subscription?.account.active ? <span className='flex justify-center items-center gap-2' >
                                            {manageStatus.isPending ? <Loader /> : <Pause className="w-5 h-5" />} Pause   </span>
                                            : <span className='flex justify-center items-center gap-2'>
                                                {manageStatus.isPending ? <Loader /> : <Play className="w-5 h-5" />} Activate   </span>}
                                        Subscription
                                    </button>
                                    <button
                                        onClick={() => deleteSubscription.mutate({ payerKey: subscription?.account.payer, uniqueSeed: subscription?.account.uniqueSeed, mintAddress: subscription?.account.mint, vaultTokenAccount: subscription?.account.vaultTokenAccount })}
                                        className={`${deleteSubscription.isPending ? "text-gray-700" : "  text-red-400"} text-center group flex w-full justify-center m-auto items-center gap-3 p-4 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                                        {
                                            deleteSubscription.isPending ? <Loader /> :
                                                <Trash className="size-5" />
                                        }
                                        Delete Subscription
                                    </button>

                                </div>

                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>

    )
}

export default subscriptionDetails


const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, }) => (
    <div className={`w-full space-y-2 justify-between transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl`}>
        {/* <div className='w-full'> */}
        <p className="text-sm font-medium text-gray-400 uppercase">{title}</p>
        <p className="text-xl = w-full rounded-xl font-semibold ">{value}</p>
        {/* </div> */}
        {/* <button className="p-3.5 bg-white/10 rounded-r-xl cursor-pointer">
            <Pencil className="w-4 text-blue-400" />
        </button> */}
    </div>
);
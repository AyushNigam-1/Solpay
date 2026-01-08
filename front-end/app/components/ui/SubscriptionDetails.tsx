import { useMutations } from '@/app/hooks/useMutations';
import { useProgram } from '@/app/hooks/useProgram';
import { Plan, StatCardProps, Subscription, Tier, Transaction } from '@/app/types';
import { formatDate, formatDuration, timeRemainingUntil } from '@/app/utils/duration';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowUpRight, Calendar, Check, CircleAlert, CircleCheck, CircleDot, CircleEllipsis, CircleX, Coins, Dot, Download, MousePointerClick, Pause, Play, Repeat2, RotateCw, Timer, Trash, X } from 'lucide-react';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Loader from './Loader';
import TableHeaders from './TableHeaders';

interface subscriptionDetailsProps {
    isOpen: boolean;
    subscription: { account: Subscription, publicKey: PublicKey }
    setPlanDetailsOpen: Dispatch<SetStateAction<boolean>>
    setPlan?: Dispatch<SetStateAction<Plan | undefined>>;
    onClose: () => void;
    isCreator: boolean
}

const subscriptionDetails = ({ isOpen, subscription, setPlan, setPlanDetailsOpen, onClose, isCreator }: subscriptionDetailsProps) => {

    const { deleteSubscription, manageAutoRenew, manageStatus } = useMutations()
    const [autoRenew, setAutoRenew] = useState(false)
    const [currentTier, setCurrentTier] = useState<Tier>()
    const { publicKey } = useProgram()

    const {
        data: transactions,
        isLoading: areTransactionsLoading,
        isError: isQueryError,
    } = useQuery<Transaction[]>({
        queryKey: ["CompanyTransactions"],
        queryFn: async () => {
            const res = await axios.get<Transaction[]>(
                `http://127.0.0.1:3000/api/transactions/${subscription.account.payer}/${subscription?.publicKey}`
            );
            let transactions = res.data;
            if (transactions.length < 6) {
                const count = 6 - transactions.length;
                const lastDate = new Date(transactions[transactions.length - 1].createdAt);
                const upcomingTransactions = Array.from({ length: count }, (_, i) => {
                    const nextPaymentDate = new Date(
                        lastDate.getTime() + Number(currentTier?.periodSeconds) * (i + 1) * 1000
                    );
                    return {
                        id: -(i + 1), // negative ID to identify as dummy
                        userPubkey: subscription.account.payer,
                        plan: transactions[0]?.plan,
                        tier: transactions[0]?.tier,
                        amount: transactions[0]?.amount || 0,
                        status: "pending",
                        subscriptionPda: subscription.publicKey,
                        txSignature: undefined,
                        createdAt: nextPaymentDate.toISOString(),
                    };
                });
                transactions = [...transactions, ...upcomingTransactions];
            }
            return transactions;
        },
        enabled: !!publicKey && !!subscription,
        staleTime: 1000 * 3000,
    });

    console.log("transactions", transactions)
    useEffect(() => {
        const tier = subscription?.account.planMetadata?.tiers.find((tier: Tier) => tier.tierName == subscription?.account.tierName)
        setCurrentTier(tier)
    }, [subscription?.account.planMetadata])

    useEffect(() => {
        if (subscription?.account?.autoRenew !== undefined && !isCreator) {
            setAutoRenew(subscription?.account.autoRenew);
        }
    }, [subscription?.account?.autoRenew]);


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


    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50 font-mono" onClose={onClose}>
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
                                className={``}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {areTransactionsLoading ? <Loader /> : <div className='space-y-4 bg-white/5 rounded-3xl text-left align-middle shadow-2xl border border-gray-800 w-full max-w-7xl  p-6  relative'>
                                    <div className=" flex justify-between items-center ">
                                        <div className='flex gap-2' >
                                            <h2 className="text-2xl font-bold text-white whitespace-nowrap">
                                                {subscription?.account.planMetadata?.name}
                                            </h2>
                                            <div className={`flex p-1 bg-white/5 rounded-lg pr-2 ${subscription?.account.active ? 'text-blue-400' : 'text-red-400'}`} >
                                                <Dot />
                                                {subscription?.account.active ? "Active" : "Deactive"}
                                            </div>
                                            <div className='h-0.5 w-full bg-white/5' />
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition  bg-white/5 p-2 rounded-full">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                    <div className='h-0.5 w-full bg-white/5' />
                                    {
                                        isCreator ? <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                            <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-3'>
                                                <span className="hidden sm:inline text-gray-400 ">User Address</span>
                                                <span className='truncate font-bold text-lg'>
                                                    {subscription?.account.payer?.toString()}
                                                    {/* {processedPlan.creator.slice(0, 20)}...{processedPlan.creator.slice(30)} */}
                                                </span>
                                            </div>
                                            <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-3'>
                                                <span className="hidden sm:inline text-gray-400 ">Token Address</span>
                                                <span className='truncate font-bold text-lg'>
                                                    {subscription && getAssociatedTokenAddressSync(
                                                        new PublicKey(subscription?.account.planMetadata?.mint!),
                                                        subscription?.account?.payer,
                                                        false, // allowOwnerOffCurve (usually false)
                                                        TOKEN_2022_PROGRAM_ID,
                                                        ASSOCIATED_TOKEN_PROGRAM_ID
                                                    ).toBase58()}
                                                </span>

                                            </div>
                                        </div>
                                            : <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                                <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-3'>
                                                    <span className="hidden sm:inline text-gray-400 ">Creator</span>
                                                    <span className='truncate font-bold text-lg'>
                                                        {subscription?.account.planMetadata?.creator?.toString()}
                                                        {/* {processedPlan.creator.slice(0, 20)}...{processedPlan.creator.slice(30)} */}
                                                    </span>
                                                </div>
                                                <div className='h-full w-2 bg-white/5' />
                                                <div className='flex flex-col gap-2 w-full bg-white/5 rounded-xl p-3'>
                                                    <span className="hidden sm:inline text-gray-400 "> Reciever</span>
                                                    <span className="truncate font-bold text-lg" >
                                                        {subscription?.account.planMetadata?.receiver.toString()}
                                                    </span>
                                                </div>
                                            </div>
                                    }
                                    <div className='h-0.5 w-full bg-white/5' />
                                    <div className='grid grid-cols-12 gap-3' >
                                        <div className="col-span-3 rounded-2xl flex flex-col h-full">
                                            {/* Header */}
                                            <div className="flex justify-between mb-4">
                                                <h6 className="text-xl font-bold">Tier</h6>

                                                <p
                                                    className={`font-medium ${subscription?.account.nextPaymentTs &&
                                                        timeRemainingUntil(subscription?.account.nextPaymentTs) === "Expired"
                                                        ? "text-red-400"
                                                        : "text-blue-400"
                                                        }`}
                                                >
                                                    {subscription?.account.nextPaymentTs &&
                                                        (timeRemainingUntil(subscription?.account.nextPaymentTs) === "Expired" ? (
                                                            <span className="flex items-center gap-2">
                                                                <CircleAlert size={18} /> Expired
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <Timer size={18} />{" "}
                                                                {timeRemainingUntil(subscription?.account.nextPaymentTs)}
                                                            </span>
                                                        ))}
                                                </p>
                                            </div>

                                            {/* Tier Card – FULL HEIGHT */}
                                            <div className="flex-1">
                                                <div
                                                    className="
                                                            h-full relative cursor-pointer rounded-2xl p-4
                                                            border-2 border-white/5
                                                            transition-all duration-200
                                                            flex flex-col justify-between
                                                        "
                                                >
                                                    {/* Top */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-2xl font-bold text-white">
                                                            {currentTier?.tierName}
                                                        </h4>
                                                        <p className="text-gray-400">
                                                            {/* {currentTier?.description || "Standard subscription tier."} */}
                                                            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum a labore ratione sunt voluptatum rerum maxime modi, odio id excepturi consequuntur doloribus repellendus
                                                        </p>
                                                    </div>

                                                    {/* Bottom */}
                                                    <div className="flex flex-col gap-3">
                                                        <div className="h-0.5 w-full bg-white/5" />

                                                        <div className="flex flex-col items-baseline gap-1">
                                                            <div className="flex gap-1 items-end">
                                                                <span className="text-3xl font-bold text-white">
                                                                    {currentTier?.amount.toString()}
                                                                </span>
                                                                <span className="font-medium text-gray-400">
                                                                    {subscription?.account.planMetadata?.tokenSymbol}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm font-medium text-gray-300">
                                                                {formatDuration(currentTier?.periodSeconds)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='col-span-9 flex flex-col gap-4 border-l-2 border-white/5 pl-3 h-full'>
                                            <div className='flex justify-between '>
                                                <h6 className='text-xl font-bold'>Transactions</h6>
                                                {
                                                    isCreator ? <button className='font-bold text-heading  flex gap-2 items-center text-blue-400' > <Download size={20} /> Export CSV</button> : <div className='relative' >
                                                        <label className="inline-flex items-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={autoRenew}
                                                                onChange={() =>
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
                                                }
                                            </div>
                                            <div className=" rounded-2xl overflow-hidden border border-white/5">
                                                <table className="w-full table-fixed text-sm text-left rtl:text-right text-body h-full">
                                                    <TableHeaders columns={headers} />
                                                    <tbody>
                                                        {transactions?.map((tx, index) => {
                                                            const isFirstRow = index === 0;
                                                            const isLastRow = index === transactions?.length - 1;
                                                            return (
                                                                <tr key={subscription?.account.bump} className={`transition cursor-pointer border border-white/5 rounded-2xl ${tx.status == 'pending' ? 'opacity-50 cursor-not-allowed' : ''} `} >
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
                                                                            <CircleCheck size={20} />
                                                                            Success
                                                                        </span> : tx.status == 'success' ? <span className='flex gap-2 items-center'>
                                                                            <CircleX size={20} />
                                                                            Failed
                                                                        </span> :
                                                                            <span className='flex gap-2 items-center'>
                                                                                <CircleEllipsis size={20} />                                                                                Pending
                                                                            </span>}
                                                                    </td>
                                                                    <td className="px-6 py-2 text-xl ">
                                                                        {
                                                                            tx.status !== 'failed' ? <button className='flex gap-2 items-center text-blue-400 hover:text-blue-500 cursor-pointer' onClick={() =>
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
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='h-0.5 w-full bg-white/5 flex' />
                                    {isCreator ? <button
                                        onClick={() => deleteSubscription.mutateAsync({ payerKey: subscription?.account.payer, uniqueSeed: subscription?.account.uniqueSeed, mintAddress: subscription?.account.mint, vaultTokenAccount: subscription?.account.vaultTokenAccount }).then(() => onClose())}
                                        className={`${deleteSubscription.isPending ? "text-gray-700" : "text-red-400"} text-center group flex  justify-center m-auto items-center gap-3 p-4 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                                        {
                                            deleteSubscription.isPending ? <Loader /> :
                                                <Trash className="size-5" />
                                        }
                                        Cancel Subscription
                                    </button> : <div className='flex gap-2' >
                                        <button className='text-center group flex w-full justify-center m-auto items-center gap-3 p-4 rounded-xl bg-white/5 text-blue-400 transition cursor-pointer font-semibold'
                                            onClick={() => { setPlan!(subscription?.account.planMetadata); setPlanDetailsOpen(true); onClose() }}
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
                                            onClick={() => deleteSubscription.mutateAsync({ payerKey: subscription?.account.payer, uniqueSeed: subscription?.account.uniqueSeed, mintAddress: subscription?.account.mint, vaultTokenAccount: subscription?.account.vaultTokenAccount }).then(() => onClose())}
                                            className={`${deleteSubscription.isPending ? "text-gray-700" : "  text-red-400"} text-center group flex w-full justify-center m-auto items-center gap-3 p-4 rounded-xl bg-white/5 transition cursor-pointer font-semibold`}>
                                            {
                                                deleteSubscription.isPending ? <Loader /> :
                                                    <Trash className="size-5" />
                                            }
                                            Delete Subscription
                                        </button>
                                    </div>}
                                </div>}
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
"use client"
import Header from '@/app/components/ui/layout/Header';
import Loader from '@/app/components/ui/extras/Loader';
import { useProgram } from '@/app/hooks/useProgram';
import { Transaction } from '@/app/types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowUpRight, CircleCheck, RotateCw } from 'lucide-react';
import Error from '@/app/components/ui/extras/Error';
import { formatDate } from '@/app/utils/duration';
import { useDbActions } from '@/app/hooks/useDbActions';
import { TABLE_HEADERS } from '@/app/utils/headers';
import { useSearch } from '@/app/hooks/useSearch';
import { StatusBadge } from '@/app/components/ui/layout/StatusBadge';

const page = () => {
    const { publicKey } = useProgram()
    const { deleteTransaction, renewSubscription } = useDbActions()

    const {
        data: transactions,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<Transaction[]>({
        queryKey: ["transactions"],
        queryFn: async () => {
            const res = await axios.get<Transaction[]>(
                `http://127.0.0.1:3001/api/transactions/user/${publicKey}`
            );
            return res.data;
        },
        enabled: !!publicKey, // Only fetch if pubkey exists
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const { searchQuery, setSearchQuery, filteredData } = useSearch(transactions, ['plan', 'tier']);

    return (
        <div className='space-y-4 font-mono'>
            <Header title="History" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
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
                                                TABLE_HEADERS.user.history.map((header, i) => {
                                                    return <div key={i} className="flex-1 px-6 py-4.5 font-bold text-lg flex items-center gap-2">
                                                        {/* {header.icon} */}
                                                        {header.title}
                                                    </div>
                                                })
                                            }
                                        </div>

                                        {/* 2. TBODY REPLACEMENT */}
                                        <div className="border-x-2 border-b-2 border-white/5 rounded-b-2xl overflow-hidden">
                                            {filteredData!.map((tx, index) => {
                                                const isLast = index === filteredData!.length - 1;
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center transition border-t border-white/5 
                                                        ${isLast ? "rounded-b-2xl" : ""}`}
                                                    >
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {formatDate(tx.createdAt)}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl font-semibold text-white">
                                                            {tx.plan}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl text-gray-400 flex items-end gap-2">
                                                            {tx.tier}
                                                        </div>
                                                        <div className="flex-1 px-6 py-4 text-xl text-gray-400 flex items-end gap-2">
                                                            {tx.amount} OPOS
                                                        </div>
                                                        <div className="flex-1 px-6 py-4  text-gray-400">
                                                            {tx.status == 'success' ? <span className='flex gap-2 items-center' >
                                                                {/* <CircleCheck />
                                                                Succeed */}
                                                                <StatusBadge
                                                                    active={tx.status == "success"}
                                                                    label={tx.status == "success" ? "Success" : "Failed"}
                                                                />
                                                            </span> :
                                                                <span className='flex gap-2 items-center'>
                                                                    <CircleCheck />
                                                                    Failed
                                                                </span>}
                                                        </div>
                                                        <div className="px-6 py-2 text-xl flex items-center gap-3 flex-1">
                                                            {
                                                                tx.status == 'success' ? <button className='flex gap-1 items-center pr-3 text-blue-400 hover:text-blue-300 cursor-pointer' onClick={() =>
                                                                    window.open(
                                                                        `https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`,
                                                                        "_blank",
                                                                        "noopener,noreferrer"
                                                                    )}>
                                                                    <ArrowUpRight className='size-5' />
                                                                    Verify
                                                                </button> :
                                                                    <button className='flex gap-1  hover:text-blue-500 items-center pr-3 cursor-pointer text-blue-400' onClick={() => renewSubscription.mutate({ subscriptionPda: tx.subscriptionPda })}>
                                                                        {
                                                                            (renewSubscription.variables?.subscriptionPda == tx.subscriptionPda && renewSubscription.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
                                                                                <RotateCw className='size-5' />                                                                    Retry
                                                                            </div>
                                                                        }
                                                                    </button>
                                                            }
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No transactions found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-2xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
        </div >
    )
}

export default page
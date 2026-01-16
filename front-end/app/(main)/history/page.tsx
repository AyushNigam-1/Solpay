"use client"
import Header from '@/app/components/ui/layout/Header';
import Loader from '@/app/components/ui/extras/Loader';
import { useProgram } from '@/app/hooks/useProgram';
import { Transaction } from '@/app/types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowUpRight, CircleCheck, RotateCw, Trash } from 'lucide-react';
import Error from '@/app/components/ui/extras/Error';
import TableHeaders from '@/app/components/ui/layout/TableHeaders';
import { formatDate } from '@/app/utils/duration';
import { useDbActions } from '@/app/hooks/useDbActions';
import { TABLE_HEADERS } from '@/app/utils/headers';
import { useSearch } from '@/app/hooks/useSearch';

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
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={TABLE_HEADERS.user.history} />
                                        <tbody>
                                            {filteredData?.map((tx) => {
                                                return (
                                                    <tr key={tx.txSignature} className="border-t-0 border-2  border-white/5"
                                                    >
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {formatDate(tx.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {tx.plan}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-gray-400">
                                                            {tx.tier}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {tx.amount} OPOS
                                                        </td>

                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {tx.status == 'success' ? <span className='flex gap-2 items-center' >
                                                                <CircleCheck />
                                                                Succeed
                                                            </span> :
                                                                <span className='flex gap-2 items-center'>
                                                                    <CircleCheck />
                                                                    Failed
                                                                </span>}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl flex items-center gap-3">
                                                            {
                                                                tx.status == 'success' ? <button className='flex gap-1 border-r-2 border-white/8 items-center pr-3 text-blue-400 hover:text-blue-500 cursor-pointer' onClick={() =>
                                                                    window.open(
                                                                        `https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`,
                                                                        "_blank",
                                                                        "noopener,noreferrer"
                                                                    )}>
                                                                    <ArrowUpRight className='size-5' />
                                                                    Verify
                                                                </button> :
                                                                    <button className='flex gap-1  hover:text-blue-500 border-r-2 border-white/8 items-center pr-3 cursor-pointer text-blue-400' onClick={() => renewSubscription.mutate({ subscriptionPda: tx.subscriptionPda })}>
                                                                        {
                                                                            (renewSubscription.variables?.subscriptionPda == tx.subscriptionPda && renewSubscription.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
                                                                                <RotateCw className='size-5' />                                                                    Retry
                                                                            </div>
                                                                        }

                                                                    </button>
                                                            }
                                                            <button className=' cursor-pointer hover:text-red-500 text-red-400' onClick={() => deleteTransaction.mutate(tx.id)}>
                                                                {
                                                                    (deleteTransaction.variables == tx.id && deleteTransaction.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
                                                                        <Trash className='size-5' />
                                                                        Delete
                                                                    </div>
                                                                }
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
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
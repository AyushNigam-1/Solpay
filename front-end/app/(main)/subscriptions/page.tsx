"use client"

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
// import numeral from 'numeral';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Subscription } from '@/app/types';
import Header from '@/app/components/ui/Header';
import TableHeaders from '@/app/components/ui/TableHeaders';
import Loader from '@/app/components/ui/Loader';
import Error from '@/app/components/ui/Error';
import { Slide, ToastContainer, toast } from 'react-toastify';
import { SubscriptionForm } from '@/app/components/ui/SubscriptionForm';
import { PublicKey } from '@solana/web3.js';
import { fetchUserTokenAccounts } from '@/app/utils/token';
import Cookies from "js-cookie"
import { formatPeriod } from '@/app/utils/duration';
import { ChevronsUpDown, CircleMinus, Delete, Expand, RemoveFormatting } from 'lucide-react';

const page = () => {
    const [isOpen, setOpen] = useState<boolean>(false)
    // const publicKey = Cookies.get("user")!
    const [pendingId, setPendingId] = useState<string | null>(null);
    // const { exchangeEscrow, cancelEscrow, isMutating } = useMutations({ setPendingId })
    // const { publicKey } = useProgram()
    const publicKey = new PublicKey(Cookies.get("user")!)

    const contractActions = useProgramActions();
    const [searchQuery, setSearchQuery] = useState<string | null>("")
    interface query {
        publickey: PublicKey, account: Subscription
    }
    const {
        data: subscriptions,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<query[]>({
        queryKey: ["AllEscrows"],
        queryFn: () => contractActions.fetchUserSubscriptions(),
        staleTime: 1000 * 3000,
    });
    console.log("subscriptions", subscriptions)
    const {
        data: tokens,
        // isLoading,
        // isFetching,
        isError,
        error,
        // refetch,
    } = useQuery({
        queryKey: ['userTokens', publicKey!.toString()],
        queryFn: () => fetchUserTokenAccounts(new PublicKey(publicKey!)),
        enabled: !!publicKey!.toString(),
        staleTime: 1000 * 3000,
    });
    console.log(tokens)

    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return subscriptions;
        }
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return subscriptions?.filter(subscription => {
            return (
                subscription.account.amount.toString().includes(lowerCaseQuery) ||
                subscription.account.amount.toString().includes(lowerCaseQuery)
            );
        });
    }, [subscriptions, searchQuery]);

    const headers = [
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            ),
            title: "Reciever"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            ),
            title: "Token"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            ),
            title: "Amount"
        },

        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            ),
            title: "Duration"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                </svg>
            ),
            title: "Next Payment"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                </svg>
            ),
            title: "Actions"
        }
    ]


    return (
        <div className='flex flex-col gap-4 font-mono' >
            <Header setOpen={setOpen} title="Subscriptions" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
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
                                            {filteredData!.map((subscription) => {
                                                return (
                                                    <tr key={subscription.account.bump} className="border-t-0 border-2  border-white/5">
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2">
                                                                <p className="text-xl font-semibold text-white">
                                                                    {subscription.account.payee.toBase58().slice(0, 15)}...

                                                                </p>
                                                                {/* <img
                                                                    src={escrow.tokenA.metadata.image}
                                                                    className='w-6 rounded-full object-cover'
                                                                    alt={`${escrow.tokenA.metadata.symbol} icon`}
                                                                />
                                                                <p className="text-xl font-semibold text-white"> */}
                                                                {/* {numeral(escrow.tokenA.amount).format('0a')} */}
                                                                {/* </p> */}
                                                                <p className="text-xl text-gray-400">
                                                                    {/* {escrow.tokenA.metadata.symbol} */}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                {/* <img
                                                                    src={escrow.tokenB.metadata.image}
                                                                    className='w-6 rounded-full object-cover'
                                                                    alt={`${escrow.tokenB.metadata.symbol} icon`}
                                                                /> */}
                                                                {/* <p className="text-xl font-semibold text-white "> */}
                                                                {/* {numeral(escrow.tokenB.amount).format('0a')} */}
                                                                {/* </p> */}
                                                                {/* <p className="text-xl text-gray-400">
                                                                    {escrow.tokenB.metadata.symbol}
                                                                </p> */}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-baseline gap-2">
                                                                <p className="text-xl text-gray-400 leading-none">
                                                                    {subscription.account.amount.toString()}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {formatPeriod(subscription.account.periodSeconds)}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {formatPeriod(subscription.account.periodSeconds)}
                                                        </td>
                                                        {/* <td className="px-6 py-2 text-xl text-gray-400">
                                                            {formatPeriod(subscription.account.periodSeconds)}
                                                        </td> */}
                                                        <td className="relative px-6 py-2">  {/* ← relative + no z-50 */}
                                                            <Menu as="div" className="relative inline-block text-center">
                                                                <MenuButton className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                                                    </svg>
                                                                </MenuButton>

                                                                <MenuItems
                                                                    anchor="bottom"
                                                                    className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white/5  z-50"
                                                                >
                                                                    <div className="py-1">
                                                                        <MenuItem>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    className={`${active ? 'bg-white/10' : ''
                                                                                        } w-full group flex items-center gap-3 px-4 py-3 text-lg text-gray-200 hover:text-white transition cursor-pointer`}
                                                                                >
                                                                                    <ChevronsUpDown className="w-5 h-5" />
                                                                                    Details
                                                                                </button>
                                                                            )}
                                                                        </MenuItem>

                                                                        <MenuItem>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    className={`${active ? 'bg-white/10' : ''
                                                                                        } w-full text-left group flex items-center gap-3 px-4 py-3 text-lg text-gray-200 hover:text-white transition cursor-pointer`}
                                                                                >
                                                                                    <CircleMinus className="w-5 h-5" />
                                                                                    Deactivate
                                                                                </button>
                                                                            )}
                                                                        </MenuItem>

                                                                        <MenuItem>
                                                                            {({ active }) => (
                                                                                <button
                                                                                    className={`${active ? 'bg-red-500/20 text-red-400' : 'text-red-400'
                                                                                        } w-full text-left group flex items-center gap-3 px-4 py-3 text-lg hover:bg-red-500/20 transition cursor-pointer`}
                                                                                >
                                                                                    <Delete className="w-5 h-5" />
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                        </MenuItem>
                                                                    </div>
                                                                </MenuItems>
                                                            </Menu>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No active subcriptions found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium">No Subscriptions found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
            <SubscriptionForm isOpen={isOpen} onClose={() => setOpen(false)} tokens={tokens!} />
            {/* <ToastContainer position="top-center" transition={Slide} theme='dark' /> */}

        </div>
    )
}

export default page
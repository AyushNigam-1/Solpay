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
import { Banknote, ChevronsUpDown, CircleDot, CircleMinus, CircleUserRound, Coins, Delete, MousePointerClick, Timer, Wallet } from 'lucide-react';

const page = () => {
    const [isOpen, setOpen] = useState<boolean>(false)
    // const publicKey = Cookies.get("user")!
    // const [pendingId, setPendingId] = useState<string | null>(null);
    // const { exchangeEscrow, cancelEscrow, isMutating } = useMutations({ setPendingId })
    // const { publicKey } = useProgram()
    const publicKey = new PublicKey(Cookies.get("user")!)

    const { cancelSubscription, fetchUserSubscriptions } = useProgramActions();
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
        queryFn: () => fetchUserSubscriptions(),
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
                <CircleUserRound />
            ),
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
                <Banknote />
            ),
            title: "Amount"
        },
        {
            icon: (
                <Wallet />
            ),
            title: "Balance"
        },
        {
            icon: (
                <Timer />
            ),
            title: "Duration"
        },
        {
            icon: (
                <CircleDot />
            ),
            title: "Status"
        },
        // {
        //     icon: (
        //         <MousePointerClick />
        //     ),
        //     title: "Actions"
        // }
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
                                                    <tr key={subscription.account.bump} className="border-t-0 border-2  border-white/5 transition hover:bg-white/5 cursor-pointer">
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {subscription.account.payer.toBase58().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                <img
                                                                    src={subscription.account.tokenMetadata.image}
                                                                    className='w-6 rounded-full object-cover'
                                                                    alt={`${subscription.account.tokenMetadata.symbol} icon`}
                                                                />
                                                                <p className="text-xl text-gray-400">
                                                                    {subscription.account.tokenMetadata.symbol}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {subscription.account.amount.toString()}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {subscription.account.prefundedAmount.toString()}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {formatPeriod(subscription.account.periodSeconds)}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {subscription.account.active ? "Active" : "Disabled"}
                                                            <button
                                                                onClick={() => cancelSubscription(subscription.account.payer, subscription.account.uniqueSeed, subscription.account.mint, subscription.account.vaultTokenAccount)}
                                                                className={` w-full text-left group flex items-center gap-3 px-4 py-3 text-lg hover:bg-red-500/20 transition cursor-pointer`}
                                                            >
                                                                <Delete className="w-5 h-5" />
                                                                Delete
                                                            </button>
                                                        </td>
                                                        {/* <td className="relative px-6 py-2">  */}
                                                        {/* <Menu as="div" className="relative inline-block     text-center">
                                                                <MenuButton className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition text-blue-400">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                                                    </svg>
                                                                    Options
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
                                                                                    // onClick={() => cancelSubscription(subscription.account.payer,subscription.account.uniqE)}
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
                                                            </Menu> */}
                                                        {/* </td> */}
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
"use client"

import Header from '@/app/components/ui/Header';
import Loader from '@/app/components/ui/Loader';
import { useProgram } from '@/app/hooks/useProgram';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo, useState } from 'react';
import Error from '@/app/components/ui/Error';
import TableHeaders from '@/app/components/ui/TableHeaders';
import { Notification } from '@/app/types';
import { Calendar, ChartNoAxesGantt, Logs, MessageCircle, MousePointerClick, RotateCw, Trash } from 'lucide-react';
import { formatDate } from '@/app/utils/duration';
import { useDbActions } from '@/app/hooks/useDbActions';


const page = () => {
    const { publicKey } = useProgram()
    const { deleteNotification, renewSubscription } = useDbActions()
    const [searchQuery, setSearchQuery] = useState<string | null>("")

    const {
        data: notifications,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<Notification[]>({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await axios.get<Notification[]>(
                `http://127.0.0.1:3000/api/notifications/user/${publicKey}`
            );
            return res.data;
        },
        enabled: !!publicKey,
        staleTime: 1000 * 60, // 1 min cache (tweak if needed)
    });

    console.log(notifications)
    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return notifications;
        }
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        return notifications?.filter(notification => {
            return (
                notification.planName.toString().includes(lowerCaseQuery));
        });
    }, [notifications, searchQuery]);

    const headers = [
        {
            icon: (
                <Calendar />
            ),
            title: "Date"
        },
        {
            icon: (
                <ChartNoAxesGantt />
            ),
            title: "Plan"
        },
        {
            icon: (
                <Logs />
            ),
            title: "Tier"
        },
        {
            icon: (
                <MessageCircle />
            ),
            title: "Message"
        },

        {
            icon: (
                <MousePointerClick />
            ),
            title: "Action"
        },
    ]
    return (
        <div className='space-y-4 font-mono'>
            <Header title="Notifications" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <div className=''>
                {isLoading || isFetching ? (
                    <Loader />
                ) :
                    isQueryError ? <Error refetch={refetch} /> :
                        (filteredData?.length != 0) ?
                            <>
                                <div className="relative overflow-x-auto shadow-xs rounded-lg ">
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <colgroup>
                                            <col className="w-[16%]" />
                                            <col className="w-[16%]" />
                                            <col className="w-[16%]" />
                                            <col className="w-[36%]" />
                                            <col className="w-[16%]" />
                                        </colgroup>
                                        <TableHeaders columns={headers} />
                                        <tbody>
                                            {filteredData?.map((notification) => {
                                                return (
                                                    <tr key={notification.id} className="border-t-0 border-2  border-white/5"
                                                    >
                                                        <td className="px-6 py-2 text-xl text-gray-400 w-1/6">
                                                            {formatDate(notification.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-white w-1/6">
                                                            {notification.planName}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl font-semibold text-white w-1/6">
                                                            {notification.tier}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 w-1/2">
                                                            {/* {plan.account.creator?.toString().slice(0, 10)}... */}
                                                            {notification.message}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl gap-4 flex items-center">
                                                            {/* {
                                                                notification.type !== "Success" && <button className='flex gap-1  hover:text-blue-500 border-r-2 border-white/8 items-center pr-4 cursor-pointer text-blue-400' onClick={() => renewSubscription.mutate({ subscriptionPda: notification.subscriptionPda })}>
                                                                    {
                                                                        (renewSubscription.variables?.subscriptionPda == notification.subscriptionPda && renewSubscription.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
                                                                            <RotateCw className='size-5' />
                                                                            {notification.type == "Expired" ? "Renew" : "Retry"}
                                                                        </div>
                                                                    }
                                                                </button>
                                                            } */}
                                                            <button className=' cursor-pointer hover:text-red-500 text-red-400' onClick={() => deleteNotification.mutate({ notificationId: notification.id })}>
                                                                {
                                                                    (deleteNotification.variables?.notificationId == notification.id && deleteNotification.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
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
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No notifications found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default page
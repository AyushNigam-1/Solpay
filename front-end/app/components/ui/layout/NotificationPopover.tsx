// // "use client"

// // import Header from '@/app/components/ui/layout/Header';
// // import Loader from '@/app/components/ui/extras/Loader';
// // import { useProgram } from '@/app/hooks/useProgram';
// // import { useQuery } from '@tanstack/react-query';
// // import axios from 'axios';
// // import { useMemo, useState } from 'react';
// // import Error from '@/app/components/ui/extras/Error';
// // import TableHeaders from '@/app/components/ui/layout/TableHeaders';
// // import { Notification } from '@/app/types';
// // import { Calendar, ChartNoAxesGantt, Logs, MessageCircle, MousePointerClick, RotateCw, Trash } from 'lucide-react';
// // import { formatDate } from '@/app/utils/duration';
// // import { useDbActions } from '@/app/hooks/useDbActions';
// // import { TABLE_HEADERS } from '@/app/utils/headers';
// // import { useSearch } from '@/app/hooks/useSearch';


// // const page = () => {
// //     const { publicKey } = useProgram()
// //     const { deleteNotification, renewSubscription } = useDbActions()

// //     const {
// //         data: notifications,
// //         isLoading,
// //         isFetching,
// //         isError: isQueryError,
// //         refetch,
// //     } = useQuery<Notification[]>({
// //         queryKey: ["notifications"],
// //         queryFn: async () => {
// //             const res = await axios.get<Notification[]>(
// //                 `http://127.0.0.1:3000/api/notifications/user/${publicKey}`
// //             );
// //             return res.data;
// //         },
// //         enabled: !!publicKey,
// //         staleTime: 1000 * 60, // 1 min cache (tweak if needed)
// //     });

// //     const { searchQuery, setSearchQuery, filteredData } = useSearch(notifications, ['planName']);

// //     return (
// //         <div className='space-y-4 font-mono'>
// //             <Header title="Notifications" refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
// //             <div className=''>
// //                 {isLoading || isFetching ? (
// //                     <Loader />
// //                 ) :
// //                     isQueryError ? <Error refetch={refetch} /> :
// //                         (filteredData?.length != 0) ?
// //                             <>
// //                                 <div className="relative overflow-x-auto shadow-xs rounded-lg ">
// //                                     <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
// //                                         <colgroup>
// //                                             <col className="w-[16%]" />
// //                                             <col className="w-[16%]" />
// //                                             <col className="w-[16%]" />
// //                                             <col className="w-[36%]" />
// //                                             <col className="w-[16%]" />
// //                                         </colgroup>
// //                                         <TableHeaders columns={TABLE_HEADERS.user.notification} />
// //                                         <tbody>
// //                                             {filteredData?.map((notification) => {
// //                                                 return (
// //                                                     <tr key={notification.id} className="border-t-0 border-2  border-white/5"
// //                                                     >
// //                                                         <td className="px-6 py-2 text-xl text-gray-400 w-1/6">
// //                                                             {formatDate(notification.createdAt)}
// //                                                         </td>
// //                                                         <td className="px-6 py-2 text-xl font-semibold text-white w-1/6">
// //                                                             {notification.planName}
// //                                                         </td>
// //                                                         <td className="px-6 py-2 text-xl font-semibold text-white w-1/6">
// //                                                             {notification.tier}
// //                                                         </td>
// //                                                         <td className="px-6 py-2 text-xl text-gray-400 w-1/2">
// //                                                             {/* {plan.account.creator?.toString().slice(0, 10)}... */}
// //                                                             {notification.message}
// //                                                         </td>
// //                                                         <td className="px-6 py-2 text-xl gap-4 flex items-center">
// //                                                             {/* {
// //                                                                 notification.type !== "Success" && <button className='flex gap-1  hover:text-blue-500 border-r-2 border-white/8 items-center pr-4 cursor-pointer text-blue-400' onClick={() => renewSubscription.mutate({ subscriptionPda: notification.subscriptionPda })}>
// //                                                                     {
// //                                                                         (renewSubscription.variables?.subscriptionPda == notification.subscriptionPda && renewSubscription.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
// //                                                                             <RotateCw className='size-5' />
// //                                                                             {notification.type == "Expired" ? "Renew" : "Retry"}
// //                                                                         </div>
// //                                                                     }
// //                                                                 </button>
// //                                                             } */}
// //                                                             <button className=' cursor-pointer hover:text-red-500 text-red-400' onClick={() => deleteNotification.mutate({ notificationId: notification.id })}>
// //                                                                 {
// //                                                                     (deleteNotification.variables?.notificationId == notification.id && deleteNotification.isPending) ? <Loader /> : <div className='flex gap-2 items-center'>
// //                                                                         <Trash className='size-5' />
// //                                                                         Delete
// //                                                                     </div>
// //                                                                 }
// //                                                             </button>
// //                                                         </td>
// //                                                     </tr>
// //                                                 )
// //                                             })}
// //                                         </tbody>
// //                                     </table>
// //                                 </div>
// //                             </>
// //                             :
// //                             !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No notifications found.</p>
// //                 }
// //                 {filteredData?.length === 0 && searchQuery && (
// //                     <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
// //                         <p className="text-xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
// //                     </div>
// //                 )}
// //             </div>
// //         </div>
// //     )
// // }

// // export default page

"use client"

import { Popover, Transition, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Fragment, useEffect } from 'react'
import {
    Bell, Check, Trash2, X,
    AlertCircle, CheckCircle2, AlertTriangle, Info
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useProgram } from '@/app/hooks/useProgram';
import Loader from '../extras/Loader';
import { formatDistanceToNow } from 'date-fns';
import { Notification, NotificationType } from '@/app/types';
import { useMutations } from '@/app/hooks/useMutations';

export default function NotificationPopover() {
    // const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const { publicKey } = useProgram()
    const { markReadMutation } = useMutations()
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
                `http://127.0.0.1:3001/api/notifications/user/${publicKey}`
            );
            return res.data;
        },
        enabled: !!publicKey,
        staleTime: 1000 * 60, // 1 min cache (tweak if needed)
    });
    console.log("notifications", notifications)

    const unreadCount = notifications?.filter(n => !n.is_read).length;

    useEffect(() => {
        if (notifications && notifications.length > 0) {
            const hasUnread = notifications.some(n => !n.is_read);
            if (hasUnread) {
                markReadMutation.mutate(publicKey!);
            }
        }
    }, [notifications]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'error': return <AlertCircle size={22} className="text-red-400" />;
            case 'success': return <CheckCircle2 size={22} className="text-green-400" />;
            case 'warning': return <AlertTriangle size={22} className="text-yellow-400" />;
            default: return <Info size={22} className="text-blue-400" />;
        }
    };

    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    {/* 1. The Trigger Button (Bell Icon) */}
                    <PopoverButton className={`
                        relative p-2 rounded-lg transition-all outline-none
                        ${open ? 'bg-white/10 text-white' : ' hover:text-white hover:bg-white/5'}
                    `}>
                        <Bell size={20} />
                        {unreadCount! > 0 && (
                            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0B0E14]" />
                        )}
                    </PopoverButton>

                    {/* 2. The Popover Panel (Dropdown) */}
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <PopoverPanel className="absolute right-0 z-50 mt-2 p-4 space-y-4 w-[500px] origin-top-right rounded-xl bg-white/5 backdrop-blur-lg focus:outline-none">

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-white flex items-center justify-between gap-2">
                                    Notifications
                                    {unreadCount! > 0 && (
                                        <span className="bg-blue-400 text-sm  text-white px-1.5  rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </h3>
                                {/* <button
                                    onClick={markAllRead}
                                    className="text-sm text-gray-200 hover:text-blue-400 transition-colors"
                                    disabled={unreadCount === 0}
                                >
                                    Mark all read
                                </button> */}
                            </div>
                            <div className="h-0.5 w-full bg-white/5 " />

                            {/* Scrollable List */}
                            <div className="h-[400px]  overflow-y-auto custom-scrollbar">
                                {(isLoading || isFetching) ?
                                    <div className="h-full flex items-center justify-center">
                                        <Loader />
                                    </div>
                                    :
                                    notifications?.length != 0 ? (
                                        <div className="divide-y divide-white/5">
                                            {notifications?.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                // className={`group relative p-4 hover:bg-white/2 transition-colors ${!notification.read ? 'bg-white/2' : ''}`}
                                                >
                                                    <div className="flex gap-3 items-start">
                                                        {/* Icon */}
                                                        <div className={` p-3 rounded-full bg-white/5 border border-white/5`}>
                                                            {getIcon(notification.type)}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between font-semibold items-start mb-0.5">
                                                                {notification.title}
                                                                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Hover Actions (Absolute positioned) */}
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#13161C]/90 p-1 rounded-lg backdrop-blur-sm border border-white/5 shadow-lg">
                                                        {/* {!notification.read && (
                                                            <button
                                                                // onClick={() => markAsRead(notification.id)}
                                                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-md"
                                                                title="Mark read"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                        )} */}
                                                        <button
                                                            // onClick={() => deleteNotification(notification.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center">
                                            <Bell className="h-8 w-8 text-gray-600 mb-2 opacity-50" />
                                            <p className="text-sm text-gray-500">No notifications</p>
                                        </div>
                                    )}
                            </div>

                            {/* Footer */}
                            {/* <div className="h-0.5 w-full bg-white/5 " /> */}

                            {/* <a href="/notifications" className="block w-full py-2 text-center text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg bg-white/5 ">
                                View full history
                            </a> */}
                        </PopoverPanel>
                    </Transition>
                </>
            )}
        </Popover>
    )
}
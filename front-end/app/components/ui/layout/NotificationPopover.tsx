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


// "use client"

// import Header from '@/app/components/ui/layout/Header';
// import { useState } from 'react';
// import {
//     Bell, CheckCircle2, AlertCircle, Clock, X, Trash2,
//     MessageSquare, AlertTriangle, Info
// } from 'lucide-react';

// // Mock Data with "type" to determine color/icon
// const MOCK_NOTIFICATIONS = [
//     {
//         id: 1,
//         type: 'error', // critical
//         title: "Subscription Expired",
//         message: "Your subscription for Spotify (Basic Tier) has ended.",
//         time: "2 hours ago",
//         read: false,
//     },
//     {
//         id: 2,
//         type: 'success',
//         title: "Payment Received",
//         message: "You received 100 OPOS from wallet 8995...d1Mj.",
//         time: "5 hours ago",
//         read: true,
//     },
//     {
//         id: 3,
//         type: 'warning',
//         title: "Low Balance",
//         message: "Your renewal wallet is below 5 SOL.",
//         time: "1 day ago",
//         read: true,
//     }
// ];

// const Page = () => {
//     // Basic state for demo
//     const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
//     const [filter, setFilter] = useState<'all' | 'unread'>('all');

//     const handleDismiss = (id: number) => {
//         setNotifications(prev => prev.filter(n => n.id !== id));
//     };

//     const clearAll = () => setNotifications([]);

//     // Helper to get icon based on type
//     const getIcon = (type: string) => {
//         switch (type) {
//             case 'error': return <AlertCircle className="text-red-400" size={24} />;
//             case 'success': return <CheckCircle2 className="text-green-400" size={24} />;
//             case 'warning': return <AlertTriangle className="text-yellow-400" size={24} />;
//             default: return <Info className="text-blue-400" size={24} />;
//         }
//     };

//     // Helper for background accent
//     const getBgColor = (type: string) => {
//         switch (type) {
//             case 'error': return 'bg-red-500/10 border-red-500/20';
//             case 'success': return 'bg-green-500/10 border-green-500/20';
//             case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
//             default: return 'bg-blue-500/10 border-blue-500/20';
//         }
//     };

//     const displayedNotifications = filter === 'all'
//         ? notifications
//         : notifications.filter(n => !n.read);

//     return (
//         <div className='space-y-6 font-inter text-gray-100 max-w-4xl mx-auto'>
//             {/* Custom Header Area with Filters */}
//             <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
//                 <div>
//                     <h1 className="text-3xl font-bold flex items-center gap-3">
//                         Notifications
//                         {notifications.filter(n => !n.read).length > 0 && (
//                             <span className="text-sm font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
//                                 {notifications.filter(n => !n.read).length}
//                             </span>
//                         )}
//                     </h1>
//                     <p className="text-gray-400 mt-1">Updates on your plans and subscribers.</p>
//                 </div>

//                 <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
//                     <button
//                         onClick={() => setFilter('all')}
//                         className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
//                     >
//                         All
//                     </button>
//                     <button
//                         onClick={() => setFilter('unread')}
//                         className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'unread' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
//                     >
//                         Unread
//                     </button>
//                 </div>
//             </div>

//             <div className='h-px w-full bg-white/5' />

//             {/* Notification Feed */}
//             <div className="space-y-3">
//                 {displayedNotifications.length > 0 ? (
//                     displayedNotifications.map((notif) => (
//                         <div
//                             key={notif.id}
//                             className={`
//                                 group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200
//                                 ${notif.read ? 'bg-white/[0.02] border-white/5' : 'bg-gray-900/80 border-white/10 shadow-lg'}
//                                 hover:bg-white/[0.04]
//                             `}
//                         >
//                             {/* Icon Box */}
//                             <div className={`p-3 rounded-xl flex-shrink-0 ${getBgColor(notif.type)}`}>
//                                 {getIcon(notif.type)}
//                             </div>

//                             {/* Content */}
//                             <div className="flex-1 min-w-0 pt-1">
//                                 <div className="flex justify-between items-start">
//                                     <h4 className={`text-base font-semibold ${notif.read ? 'text-gray-300' : 'text-white'}`}>
//                                         {notif.title}
//                                     </h4>
//                                     <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap ml-4">
//                                         <Clock size={12} /> {notif.time}
//                                     </span>
//                                 </div>
//                                 <p className="text-sm text-gray-400 mt-1 leading-relaxed">
//                                     {notif.message}
//                                 </p>
//                             </div>

//                             {/* Action Buttons (Visible on Hover) */}
//                             <button
//                                 onClick={() => handleDismiss(notif.id)}
//                                 className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
//                                 title="Dismiss"
//                             >
//                                 <X size={16} />
//                             </button>

//                             {/* Unread Indicator Dot */}
//                             {!notif.read && (
//                                 <div className="absolute top-1/2 -left-1 w-1.5 h-8 bg-blue-500 rounded-r-full -translate-y-1/2" />
//                             )}
//                         </div>
//                     ))
//                 ) : (
//                     <div className="text-center py-20 text-gray-500 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
//                         <Bell className="mx-auto mb-3 opacity-20" size={40} />
//                         <p>No notifications found.</p>
//                     </div>
//                 )}
//             </div>

//             {/* Footer Action */}
//             {displayedNotifications.length > 0 && (
//                 <div className="flex justify-center pt-4">
//                     <button
//                         onClick={clearAll}
//                         className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
//                     >
//                         <Trash2 size={14} /> Clear All Notifications
//                     </button>
//                 </div>
//             )}
//         </div>
//     )
// }

// export default Page
"use client"

import { Popover, Transition, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Fragment, useState } from 'react'
import {
    Bell, Check, Trash2, X,
    AlertCircle, CheckCircle2, AlertTriangle, Info
} from 'lucide-react'

// --- Types & Mock Data ---
type NotificationType = 'error' | 'success' | 'warning' | 'info';

interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 1, type: 'error', title: "Subscription Expired", message: "Spotify (Basic) ended.", time: "2h ago", read: false },
    { id: 2, type: 'success', title: "Payment Received", message: "+100 OPOS received.", time: "5h ago", read: false },
    { id: 3, type: 'warning', title: "Low Balance", message: "Wallet below 5 SOL.", time: "1d ago", read: true },
    { id: 4, type: 'info', title: "System Update", message: "Maintenance tonight.", time: "2d ago", read: true },
];

export default function NotificationPopover() {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    // Filter logic (optional: show unread first)
    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const deleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // --- Helper for Icons & Colors ---
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
                        {unreadCount > 0 && (
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
                        <PopoverPanel className="absolute right-0 z-50 mt-2 w-[480px] origin-top-right rounded-xl bg-white/5 backdrop-blur-lg focus:outline-none">

                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                    Notifications
                                    {/* {unreadCount > 0 && (
                                        <span className="bg-blue-600 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )} */}
                                </h3>
                                {/* <button
                                    onClick={markAllRead}
                                    className="text-sm text-gray-200 hover:text-blue-400 transition-colors"
                                    disabled={unreadCount === 0}
                                >
                                    Mark all read
                                </button> */}
                            </div>

                            {/* Scrollable List */}
                            <div className="max-h-[400px]  overflow-y-auto custom-scrollbar">
                                {notifications.length > 0 ? (
                                    <div className="divide-y divide-white/5">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`group relative p-4 hover:bg-white/2 transition-colors ${!notification.read ? 'bg-white/2' : ''}`}
                                            >
                                                <div className="flex gap-3 items-start">
                                                    {/* Icon */}
                                                    <div className={` p-3 rounded-full bg-white/5 border border-white/5`}>
                                                        {getIcon(notification.type)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <p className={` font-medium truncate ${notification.read ? 'text-gray-400' : 'text-gray-100'}`}>
                                                                {notification.title}
                                                            </p>
                                                            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                                {notification.time}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Hover Actions (Absolute positioned) */}
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#13161C]/90 p-1 rounded-lg backdrop-blur-sm border border-white/5 shadow-lg">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-md"
                                                            title="Mark read"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {/* Unread Dot */}
                                                {!notification.read && (
                                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <Bell className="mx-auto h-8 w-8 text-gray-600 mb-2 opacity-50" />
                                        <p className="text-sm text-gray-500">No notifications</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 border-t border-white/5 bg-white/5">
                                <a href="/notifications" className="block w-full py-2 text-center text-xs font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                    View full history
                                </a>
                            </div>
                        </PopoverPanel>
                    </Transition>
                </>
            )}
        </Popover>
    )
}
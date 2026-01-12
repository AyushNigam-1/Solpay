"use client"

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChartNoAxesGanttIcon, History, Ticket } from 'lucide-react';
import Cookies from "js-cookie";

const Sidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const router = useRouter();
    const currentPage = usePathname();
    const isCreator = Cookies.get("role") == '0'
    const handleNavigate = useCallback((route: string) => {
        router.push(route);
        console.log("Navigating to:", route);
        if (isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    }, [isSidebarOpen]);

    const navOptions = isCreator ? [
        {
            icon: (<ChartNoAxesGanttIcon />),
            text: "Plan", route: "/creator/plan"
        },
        {
            icon: (<Ticket />
            ), text: "Subscriptions", route: "/creator/subscriptions"
        },
        {
            icon: (<Bell />),
            text: "Notifications", route: "/notifications"
        },
        {
            icon: (<History />),
            text: "History", route: "/history"
        }
    ] : [
        {
            icon: (<ChartNoAxesGanttIcon />),
            text: "Plans", route: "/user/plans"
        },
        {
            icon: (<Ticket />
            ), text: "Subscriptions", route: "/user/subscriptions"
        },
        {
            icon: (<Bell />),
            text: "Notifications", route: "/notifications"
        },
        {
            icon: (<History />),
            text: "History", route: "/history"
        }
    ];

    return (
        <aside
            id="default-sidebar"
            className={` z-40 w-64 h-screen transition-transform transform font-mono ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } sm:translate-x-0`}
            aria-label="Sidebar"
        >
            <div className="h-full  overflow-y-auto bg-white/5">
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white p-3.5 border-b-2 border-b-white/5">
                    Solpay
                </div>
                <ul className="space-y-2 font-medium p-3">
                    {navOptions.map((option, index) => (
                        <li key={index}>
                            <button className={`cursor-pointer font-semibold flex items-center gap-4 text-lg w-full  p-2   group ${currentPage === option.route ? "border-s-2 border-blue-400 text-blue-400" : "text-white "}`} onClick={() => handleNavigate(option.route)} >
                                {option.icon}
                                <span className=" whitespace-nowrap">{option.text}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    )
}

export default Sidebar
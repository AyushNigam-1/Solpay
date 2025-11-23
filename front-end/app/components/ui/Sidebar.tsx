"use client"

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation';
// import { NavItemProps } from '@/app/types/props';

const Sidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const router = useRouter();
    const currentPage = usePathname();

    const handleNavigate = useCallback((route: string) => {
        router.push(route);
        console.log("Navigating to:", route);
        if (isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    }, [isSidebarOpen]);

    // const navOptions: Omit<NavItemProps, 'onNavigate' | 'isActive'>[] = [
    const navOptions = [

        {
            icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            ), text: "Subscriptions", route: "/subscriptions"
        },
        // {
        //     icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
        //         <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        //     </svg>), text: "History", route: "/history"
        // },
        // {
        //     icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
        //         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        //     </svg>), text: "Deals", route: "/escrows"
        // },
        // {
        //     icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
        //         <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        //     </svg>), text: "History", route: "/history"
        // },
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
                    Escrow
                </div>
                <ul className="space-y-2 font-medium p-3">
                    {navOptions.map((option, index) => (
                        <li key={index}>
                            <button className={`cursor-pointer flex items-center gap-4 text-lg w-full  p-2   group ${currentPage === option.route ? "border-s-2 border-blue-400 text-blue-400" : "text-white "}`} onClick={() => handleNavigate(option.route)} >
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
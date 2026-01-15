"use client"

import { useProgram } from '@/app/hooks/useProgram';
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { User, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NotificationPopover from './NotificationPopover';
const Navbar = () => {

    const router = useRouter()

    const { disconnect, publicKey } = useProgram();

    return (
        <nav className="bg-white/5 w-full font-mono">
            <div className=" flex flex-wrap items-center justify-between p-4">
                <div className='text-2xl ' ></div>
                <div className='flex gap-3 items-center'>
                    <NotificationPopover />
                    <Menu as="div" className="relative">
                        <MenuButton className="flex text-sm focus-visible:outline-none rounded-full ring-0 border-0" >
                            <UserCircle size={25} />
                        </MenuButton>
                        <MenuItems
                            transition
                            anchor="bottom end"
                            className="z-50 my-2 w-64 origin-top-right rounded-xl focus-visible:outline-none bg-white/10 backdrop-blur divide-y divide-gray-100 shadow-sm transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                        >
                            <div className="px-4 py-4 space-y-4 " aria-labelledby="user-menu-button">
                                <MenuItem>
                                    <p className="flex gap-2 items-center text-xl  text-gray-700  dark:text-gray-200 dark:hover:text-white"><User />
                                        {publicKey?.toString()?.slice(0, 12)}...</p>
                                </MenuItem>
                                <div className='bg-gray-600 w-full h-0.5 ' />
                                <MenuItem>
                                    <button onClick={() => disconnect().then(() => router.push("/"))} className='p-2 bg-white/5 text-red-400 rounded-lg mt-auto flex gap-2 items-center justify-center w-full cursor-pointer hover:text-red-500'> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                    </svg>
                                        Logout</button>
                                </MenuItem>
                            </div>
                        </MenuItems>
                    </Menu>
                </div>

            </div>
        </nav>
    )
}

export default Navbar
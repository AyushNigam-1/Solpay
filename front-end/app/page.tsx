"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Tab, TabGroup, TabList } from "@headlessui/react";
import { User, Sparkles, ArrowRight, Wallet } from "lucide-react";

// --- Components ---

// 1. Subtle Grid Background
const GridBackground = () => (
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>
    <div className="absolute inset-0 bg-black mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,transparent_70%,black_100%)]"></div>
  </div>
);

function App() {
  const { setVisible } = useWalletModal();
  const { publicKey, connected, disconnect } = useWallet();
  const [role, setRole] = useState<0 | 1>(0); // 0 = Creator, 1 = User
  const router = useRouter();
  const API_BASE = "http://localhost:3001";

  // Dynamic Theme Colors based on Role
  const theme = role === 0
    ? { color: "indigo", hex: "#6366f1", label: "Creator" }
    : { color: "emerald", hex: "#10b981", label: "User" };

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async (address: string) => {
      const { data } = await axios.get(`${API_BASE}/api/user/${address}`);
      return data;
    },
    onSuccess: (data) => {
      Cookies.set("user", JSON.stringify(data));
      Cookies.set("role", role.toString());
      role === 0 ? router.push("/creator/plan") : router.push("/user/plans");
    },
  });
  const handleAction = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true); // Opens the official selection modal
    }
  };
  useEffect(() => {
    if (connected && publicKey) {
      console.log("triggering")
      submit(publicKey.toBase58());
    }
  }, [connected, publicKey]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#0B0E14] text-white selection:bg-indigo-500/30">

      {/* 2. Animated Background Glow */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%, ${theme.hex}20 0%, transparent 50%)`,
          ],
        }}
        transition={{ duration: 1 }} // Smooth transition when toggling roles
      />
      <GridBackground />

      {/* 3. Main Card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">

          {/* Top Decorative Line */}
          <motion.div
            className={`h-1 w-full `}
            layoutId="active-strip"
          />

          <div className="p-8 space-y-8 font-mono">

            {/* Header Section */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 mb-4 ring-1 ring-white/10"
              >
                <span className="text-2xl">⚡</span>
              </motion.div>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Solpay
              </h1>
              <p className="text-gray-400 text-sm">
                The decentralized subscription layer for Solana.
              </p>
            </div>

            {/* Role Switcher */}
            <div className="space-y-4 ">
              <label className="text-xs font-semibold text-gray-500 uppercase flex justify-center">
                Continue as
              </label>
              <TabGroup selectedIndex={role} onChange={(e) => setRole(e as any)} >
                <TabList className="flex bg-black/20 p-1 rounded-xl border border-white/5 relative">
                  {/* Creator Tab */}
                  <Tab className={({ selected }) =>
                    `relative w-full py-2.5 text-sm font-medium rounded-lg outline-none transition-all duration-300
                    ${selected ? 'text-white' : 'text-gray-400 hover:text-white'}`
                  }>
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <Sparkles size={16} />
                      <span>Creator</span>
                    </div>
                    {role === 0 && (
                      <motion.div
                        layoutId="active-tab"
                        className="absolute inset-0 bg-blue-400 hover:bg-blue-400  rounded-lg shadow-lg shadow-indigo-900/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Tab>

                  {/* User Tab */}
                  <Tab className={({ selected }) =>
                    `relative w-full py-2.5 text-sm font-medium rounded-lg outline-none transition-all duration-300
                    ${selected ? 'text-white' : 'text-gray-400 hover:text-white'}`
                  }>
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <User size={16} />
                      <span>User</span>
                    </div>
                    {role === 1 && (
                      <motion.div
                        layoutId="active-tab"
                        className="absolute inset-0 bg-blue-400 hover:bg-blue-400 rounded-lg shadow-lg shadow-emerald-900/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Tab>
                </TabList>
              </TabGroup>
            </div>

            {/* Action Section */}
            <div className="space-y-4 pt-2">
              <div className="wallet-adapter-wrapper w-full">
                {/* NOTE: We use a wrapper class to force the wallet button to expand.
                   Add this CSS to your global globals.css file:
                   .wallet-adapter-button { width: 100% !important; justify-content: center !important; }
                */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAction}
                  className="w-full h-14 bg-blue-400 hover:bg-blue-400 text-white font-bold rounded-xl 
                 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <Wallet className="w-5 h-5" />
                  {connected ? (
                    <span>{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
                  ) : (
                    "Connect Your Wallet"
                  )}
                </motion.button>
                {/* </motion.div> */}
              </div>

              {/* Status Message */}
              <AnimatePresence mode="wait">
                {connected ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-white/5 py-2 rounded-lg border border-white/5"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Connected: <span className=" text-white">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
                  </motion.div>
                ) : (
                  <motion.p
                    key="disconnected"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs text-gray-500"
                  >
                    Connect your wallet to access the dashboard
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Footer Card Decor */}
          {/* <div className="bg-black/20 p-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono uppercase tracking-wider">
            <span>Status: Operational</span>
            <span className="flex items-center gap-1">v1.0.2 <ArrowRight size={10} /></span>
          </div> */}

        </div>
      </motion.div >
    </div >
  );
}

export default App;
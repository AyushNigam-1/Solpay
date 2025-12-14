import React, { useState, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { CheckCircle2, Crown, Zap, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, Tier } from '@/app/types';
import { useProgram } from '@/app/hooks/useProgram';

// Helper to safely convert BN/string/number to a Javascript number
// Note: For very large numbers (token amounts), keep as string for display if needed, 
// but for periodSeconds (timestamps), number is usually safe.
const safeToNumber = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return Number(val);
    // Check if it's an Anchor BN (has .toNumber method)
    if (val.toNumber) {
        try {
            return val.toNumber();
        } catch (e) {
            return 0; // Fallback if number is too large for JS Number
        }
    }
    // Check if it has _bn property (internal BN representation)
    if (val._bn) {
        // We can't easily access internal _bn without re-wrapping, 
        // better to assume the parent passes a valid BN or string.
        // Attempting to stringify:
        return Number(val.toString());
    }
    return 0;
};

// Helper to safely convert to String (for Pubkeys, large amounts)
const safeToString = (val: any): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (val.toBase58) return val.toBase58(); // PublicKey
    if (val.toString) return val.toString(); // BN or other objects
    return "";
};

// Helper to format seconds into readable duration
const formatDuration = (val: any) => {
    const seconds = safeToNumber(val);
    if (!seconds) return "Unknown Duration";
    const days = Math.floor(seconds / (3600 * 24));
    if (days >= 30) return `${Math.floor(days / 30)} Month(s)`;
    if (days >= 7) return `${Math.floor(days / 7)} Week(s)`;
    return `${days} Day(s)`;
};

// Helper for Tier Icons
const TierIcon = ({ name }: { name: string }) => {
    const n = name.toLowerCase();
    if (n.includes('pro') || n.includes('premium')) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (n.includes('basic') || n.includes('starter')) return <Zap className="w-6 h-6 text-blue-400" />;
    return <ShieldCheck className="w-6 h-6 text-green-400" />;
};

interface PlanDetailsProps {
    plan: Plan | null;
    planPDA: PublicKey;
    open: boolean;
    setOpen: (open: boolean) => void;
    onSubscribe?: (tier: any) => void; // Using any to pass back the processed tier
    type: string
    subscriptionPDA?: PublicKey
    subscriptionPayer?: PublicKey
}

const PlanDetails = ({ plan, planPDA, open, setOpen, onSubscribe, type, subscriptionPDA, subscriptionPayer }: PlanDetailsProps) => {

    if (!plan) {
        return
    }
    const processedPlan = useMemo(() => {
        if (!plan) return null;
        return {
            ...plan,
            creator: safeToString(plan.creator),
            receiver: safeToString(plan.receiver),
            tiers: plan.tiers.map(tier => ({
                ...tier,
                amount: safeToNumber(tier.amount),
                periodSeconds: safeToNumber(tier.periodSeconds)
            }))
        };
    }, [plan]);

    const { publicKey } = useProgram()
    const { initializeSubscription, updateSubscription } = useProgramActions()
    const [duration, setDuration] = useState(safeToNumber(processedPlan?.tiers[0].periodSeconds))
    const [amount, setAmount] = useState(safeToNumber(processedPlan?.tiers[0].amount))
    const [selectedTier, setSelectedTier] = useState<Tier | null>(processedPlan?.tiers[0]!);

    const handleTierSelect = (tier: Tier) => {
        setSelectedTier(tier);
        setDuration(tier.periodSeconds)
        setAmount(tier.amount)
    };

    const closeModal = () => {
        setOpen(false);
        setSelectedTier(null);
    };

    if (!processedPlan) return null;

    return (
        <Transition show={open} as={React.Fragment}>
            <Dialog as="div" className="relative z-50 font-mono" onClose={closeModal}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 scale-90 -translate-y-12"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-12"
                        >
                            <DialogPanel className="w-full max-w-6xl transform overflow-hidden rounded-3xl bg-white/5 text-left align-middle shadow-2xl border border-gray-800 transition-all font-inter text-white relative p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-extrabold text-white tracking-tight truncate">{processedPlan.name}</h2>
                                    <button
                                        onClick={closeModal}
                                        className=" text-gray-400 hover:text-white transition-colors z-10 bg-white/5 rounded-full p-2 hover:bg-gray-700"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className='h-0.5 w-full bg-white/5' />
                                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                                    <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-2'>
                                        <span className="hidden sm:inline text-gray-400 ">Creator</span>
                                        <span className='truncate font-bold text-lg'>
                                            {processedPlan.creator}
                                            {/* {processedPlan.creator.slice(0, 20)}...{processedPlan.creator.slice(30)} */}
                                        </span>
                                    </div>
                                    <div className='flex flex-col gap-2 bg-white/5 rounded-xl w-full p-2'>
                                        <span className="hidden sm:inline text-gray-400 "> Reciever</span>
                                        <span className="truncate font-bold text-lg" >
                                            {processedPlan.receiver}
                                        </span>
                                    </div>
                                </div>
                                <div className='h-0.5 w-full bg-white/5' />
                                <div className="flex justify-between">
                                    <h2 className="text-xl font-extrabold text-gray-200 tracking-tight truncate">Choose Tier</h2>
                                    <div className='relative' >
                                        <label className="inline-flex items-center cursor-pointer ">

                                            <input type="checkbox" className="sr-only peer" defaultChecked
                                            // onClick={() => setAutoRenew(!autoRenew)} 
                                            />
                                            <div className="relative w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md peer-checked:bg-brand">
                                            </div>
                                            <span className="select-none ms-2 font-medium text-heading">Auto-Renew</span>
                                        </label>

                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="max-h-[70vh]">
                                    {/* <h3 className="text-lg font-semibold text-gray-300 mb-6">Select a Subscription Tier</h3> */}

                                    {/* Tiers Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {
                                            processedPlan.tiers && processedPlan.tiers.length > 0
                                                ? (
                                                    processedPlan.tiers.map((tier, index) => {
                                                        const isSelected = JSON.stringify(selectedTier) === JSON.stringify(tier);
                                                        return (
                                                            <div
                                                                key={index}
                                                                onClick={() => handleTierSelect(tier)}
                                                                className={`relative cursor-pointer rounded-2xl p-4 border-2 transition-all duration-200 group flex flex-col justify-between space-y-3
                                                            ${isSelected
                                                                        ? 'border-blue-400/70 bg-blue-900/10 shadow-lg shadow-blue-900/20'
                                                                        : 'border-white/6 bg-white/5  hover:bg-white/8'
                                                                    }
                                                        `}
                                                            >
                                                                {/* Selection Checkmark */}
                                                                {isSelected && (
                                                                    <div className="absolute top-4 right-4 text-blue-400">
                                                                        <CheckCircle2 className="w-6 h-6" />
                                                                    </div>
                                                                )}

                                                                {/* <div className={`p-3 rounded-xl  mb-3 ${isSelected ? 'bg-blue-500/20' : 'bg-gray-700/50 group-hover:bg-gray-700'}`}>
                                                                    <TierIcon name={tier.tierName} />
                                                                </div> */}
                                                                <div className='space-y-3'>
                                                                    <h4 className="text-2xl font-bold text-white">{tier.tierName}</h4>
                                                                    <p className="text-gray-400">{tier.description || "Standard subscription tier."}</p>
                                                                </div>
                                                                <div className='flex flex-col gap-3'>
                                                                    <div className='h-0.5 w-full bg-white/5 flex' />
                                                                    <div className="flex flex-col items-baseline gap-1">
                                                                        <div className=" flex gap-1 items-end ">
                                                                            {/* Displaying stringified amount */}
                                                                            <span className='text-3xl font-bold text-white'>
                                                                                {tier.amount}
                                                                            </span>
                                                                            <span className=" font-medium text-gray-400">{processedPlan.tokenSymbol}</span>
                                                                        </div>
                                                                        <div className="text-sm font-medium text-gray-300 ">
                                                                            Every {formatDuration(tier.periodSeconds)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-full text-center py-10 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
                                                        No subscription tiers available for this plan.
                                                    </div>
                                                )}
                                    </div>

                                    {/* Footer / Subscribe Action */}

                                </div>
                                <div className='h-0.5 w-full bg-white/5' />

                                {/* <div className='h-0.5 w-full bg-white/5' /> */}

                                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">

                                    <button
                                        onClick={() => type == "new" ? initializeSubscription(selectedTier!.tierName, planPDA, publicKey!, duration, new PublicKey(plan.mint), selectedTier?.periodSeconds, amount, false) : updateSubscription(subscriptionPDA!, "tier", selectedTier?.tierName!, subscriptionPayer!)
                                        }
                                        disabled={!selectedTier}
                                        className={`
                                                w-full sm:w-auto p-3 rounded-lg font-semibold text-lg shadow-lg transition-all flex items-center justify-center gap-2
                                                ${selectedTier
                                                ? 'bg-blue-400/70  text-white hover:shadow-blue-500/25 cursor-pointer transform hover:-translate-y-0.5'
                                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-gray-700'
                                            }
                                            `}
                                    >
                                        {/* {selectedTier ? (
                                            <> */}
                                        <Zap className="w-5 h-5 " />
                                        <span>Subscribe</span>
                                        {/* </>
                                        ) : 'Select a Tier'} */}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default PlanDetails;
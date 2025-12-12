import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plan, StatCardProps, Subscription } from '@/app/types';
import { formatPeriod } from '@/app/utils/duration';
import { Ban, Calendar, CheckCircle2, ChevronLeft, ChevronRight, CircleArrowDown, CircleArrowUp, CircleCheck, CircleDot, Coins, Dot, History, Pause, Pen, Play, Repeat2, Timer, Trash, Wallet } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { PublicKey } from '@solana/web3.js';
import TableHeaders from './TableHeaders';

interface SubscriptionDetailsProps {
    isOpen: boolean;
    subscription: { account: Subscription, publicKey: PublicKey }
    subscriptionPDA: PublicKey;
    setPlanDetailsOpen: Dispatch<SetStateAction<boolean>>
    setPlan: Dispatch<SetStateAction<Plan>>;
    setPopupAction: Dispatch<SetStateAction<"fund" | "withdraw">>;
    setPopupOpen: Dispatch<SetStateAction<boolean>>;
    onClose: () => void;
}

const SubscriptionDetails = ({ isOpen, subscription, setPopupAction, setPlan, setPlanDetailsOpen, setPopupOpen, onClose }: SubscriptionDetailsProps) => {
    console.log("subscription", subscription)

    const modalClasses = isOpen
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-4 scale-95 pointer-events-none';

    const { cancelSubscription, updateSubscription } = useProgramActions();

    // console.log("subscription",)
    // const currentTier = subscription?.account.planMetaData.tiers.find((tier) => tier.tierName == subscription.account.tierName)
    const handleClose = () => {
        // if (!isMutating) {
        onClose();
        setTimeout(() => {
            // setSuccessPDA(null);
            // setFormData(initialFormState);
        }, 300);
    }


    const headers: any = [
        {
            icon: (
                <Calendar size={20} />
            ),
            title: "Date"
        },
        {
            icon: (
                <Coins size={20} />
            ),
            title: "Token"
        },
        {
            icon: (
                <CircleDot size={20} />
            ),
            title: "Status"
        },
    ]
    const transactions = [
        {
            data: "2025/11/11",
            amount: 25000,
            status: "Completed"
        },
        {
            data: "2026/01/11",
            amount: 8750.50,
            status: "Pending"
        },
        {
            data: "2026/03/11",
            amount: 45000,
            status: "Pending"
        },
        {
            data: "2026/05/11",
            amount: 120000,
            status: "Pending"
        },
        {
            data: "2026/07/11",
            amount: 33500.75,
            status: "Pending"
        },
        {
            data: "2026/09/11",
            amount: 120000,
            status: "Pending"
        },
        {
            data: "2026/11/11",
            amount: 33500.75,
            status: "Pending"
        },
    ];
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
    const formatDuration = (val: any) => {
        const seconds = safeToNumber(val);
        if (!seconds) return "Unknown Duration";
        const days = Math.floor(seconds / (3600 * 24));
        if (days >= 30) return `${Math.floor(days / 30)} Month(s)`;
        if (days >= 7) return `${Math.floor(days / 7)} Week(s)`;
        return `${days} Day(s)`;
    };
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm  transition-opacity duration-300"
            onClick={handleClose}
        >
            <div
                className={`bg-white/5 rounded-3xl text-left align-middle shadow-2xl border border-gray-800 w-full max-w-6xl transition-all duration-300 ease-out ${modalClasses} p-6 space-y-4 relative`}
                onClick={(e) => e.stopPropagation()}
            >

                <div className=" flex justify-between items-center ">
                    <div className='flex gap-2' >
                        <h2 className="text-2xl font-bold text-white ">
                            {/* {subscription.account.planMetaData.name} */}
                        </h2>
                        <div className={`flex p-1 bg-white/5 rounded-lg pr-2 ${subscription.account.active ? 'text-green-400' : 'text-red-400'}`} >
                            <Dot />
                            {subscription.account.active ? "Active" : "Deactive"}
                        </div>
                        {/* <div className='h-0.5 w-full bg-white/5' /> */}
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition  bg-white/5 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    {/* <div className='flex gap-4' > */}
                    {/* <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold' >
                        <History size={20} />
                        Recent Transactions
                    </button> */}


                    {/* </div> */}
                </div>
                {/* <div className='h-0.5 w-full bg-white/5' /> */}
                {/* <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <div className='flex flex-col gap-2 bg-white/5 p-3 rounded-2xl w-full'>
                        <span className="hidden sm:inline text-gray-400 text-sm">Creator</span>
                        <span className='truncate font-bold'>
                            {subscription.account.planMetaData.creator.toBase58()}
                        </span>
                    </div>
                    <div className='flex flex-col gap-2 bg-white/5 p-3 rounded-2xl w-full'>
                        <span className="hidden sm:inline text-gray-400 text-sm"> Reciever</span>
                        <span className="truncate font-bold" >
                            {subscription.account.planMetaData.receiver.toBase58()}
                        </span>
                    </div>
                </div> */}
                {/* <StatCard title='Created By' value={subscription.account.planMetaData.creator.toBase58()} icon={Banknote} />
                <StatCard title='Reciever' value={subscription.account.planMetaData.receiver.toBase58()} icon={Banknote} /> */}

                <div className='h-0.5 w-full bg-white/5' />

                {/* <div className='grid grid-cols-3 gap-4' >
                    <StatCard title='Name' value={currentTier?.tierName} icon={Timer} />
                    <StatCard title='Amount' value={currentTier?.amount.toString()} icon={Banknote} />
                    <StatCard title='Duration' value={formatPeriod(currentTier?.periodSeconds)} icon={Timer} />
                </div>
                <StatCard title='Description' value={currentTier?.description} icon={Banknote} /> */}
                <div className='grid grid-cols-12 gap-3' >
                    <div className='space-y-4 col-span-3 rounded-2xl'>
                        <div className='flex justify-between'>
                            <h6 className='text-xl font-bold'>Tier</h6>
                            <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold mb-0'
                            // onClick={() => { setPlan(subscription.account.planMetaData); setPlanDetailsOpen(true); onClose() }}
                            >
                                <Repeat2 />
                                Change Tier
                            </button>
                        </div>
                        <div className='h-0.5 w-full bg-white/5' />

                        <div
                            className={`relative cursor-pointer rounded-2xl max-w-xs  p-4 border-2 transition-all duration-200 group flex flex-col justify-between space-y-3 border-white/5 `}
                        >
                            {/* <div className="absolute top-4 right-4 text-blue-400">
                                <CheckCircle2 className="w-6 h-6" />
                            </div> */}
                            {/* <div className={`p-3 rounded-xl  mb-3 ${isSelected ? 'bg-blue-500/20' : 'bg-gray-700/50 group-hover:bg-gray-700'}`}>
                                                                                    <TierIcon name={tier.tierName} />
                                                                                </div> */}
                            <div className='space-y-3'>
                                {/* <h4 className="text-2xl font-bold text-white">{currentTier?.tierName}</h4>
                                <p className="text-gray-400">{currentTier?.description || "Standard subscription tier."} Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim libero provident assumenda? Eius sunt molestiae laboriosam illum quae dolor dolores qui rem maiores, nisi doloremque!s </p> */}
                            </div>
                            <div className='flex flex-col gap-3'>
                                <div className='h-0.5 w-full bg-white/5 flex' />
                                <div className="flex flex-col items-baseline gap-1">
                                    <div className=" flex gap-1 items-end ">
                                        {/* Displaying stringified amount */}
                                        <span className='text-3xl font-bold text-white'>
                                            {/* {currentTier?.amount.toString()} */}
                                        </span>
                                        {/* <span className=" font-medium text-gray-400">{subscription.account.planMetaData.tokenSymbol}</span> */}
                                    </div>
                                    <div className="text-sm font-medium text-gray-300 ">
                                        {/* Every 2 Months */}
                                        {/* {formatDuration(currentTier?.periodSeconds)} */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='h-0.5 w-full bg-white/5' />


                        <div className='flex flex-col gap-2 m-0'>
                            <span className="hidden sm:inline text-gray-400 text-sm text-center"> Duration</span>
                            <span className='flex gap-4 items-center justify-center'>
                                <button
                                    //  disabled={duration - selectedTier?.periodSeconds == 0}
                                    className='p-0.5 rounded-full bg-white/5 flex justify-center items-center cursor-pointer'
                                // onClick={() => { setDuration(duration - selectedTier?.periodSeconds); setAmount(amount - selectedTier?.amount) }}
                                // onClick={() => updateSubscription(subscription.publicKey, "duration", subscription.account.duration.sub(currentTier?.periodSeconds), subscription.account.payer)}
                                >
                                    <ChevronLeft />
                                </button>
                                <span className="truncate font-bold text-xl" >
                                    {/* {formatPeriod(subscription.account.duration)} */}
                                    {/* {processedPlan.receiver} */}
                                </span>
                                <button className='p-0.5 rounded-full bg-white/5 flex justify-center items-center cursor-pointer'
                                // onClick={() => { setDuration(duration + selectedTier?.periodSeconds); setAmount(amount + selectedTier?.amount) }}
                                // onClick={() => updateSubscription(subscription.publicKey, "duration", subscription.account.duration.add(currentTier?.periodSeconds), subscription.account.payer)}
                                >
                                    <ChevronRight />
                                </button>
                            </span>
                        </div>
                        <div>
                        </div>

                    </div>
                    {/* <div className='w-0.5 max-h-full bg-white/5 flex' /> */}

                    <div className='col-span-9 flex flex-col gap-4 border-l-2 border-white/5 pl-3 h-full'>
                        <div className='flex justify-between '>
                            <h6 className='text-xl font-bold'>Transactions</h6>
                            <span className='flex justify-center items-end gap-1 text-lg ' >
                                <h6 className='text-gray-400'>
                                    Bal:
                                </h6>
                                <h4 className='font-semibold text-blue-400'>
                                    {/* {subscription.account.prefundedAmount.toString()} {subscription.account.planMetaData.tokenSymbol} */}
                                </h4>
                                {/* <h6 className='font-semibold'>
                                                              </h6> */}
                            </span>
                        </div>
                        <div className='h-0.5 w-full bg-white/5' />
                        <div className="rounded-2xl overflow-hidden border border-white/10">
                            <table className="w-full table-fixed text-sm text-left rtl:text-right text-body h-full">
                                <TableHeaders columns={headers} />
                                <tbody>

                                    {transactions.map((tx, index) => {
                                        const isFirstRow = index === 0;
                                        const isLastRow = index === transactions.length - 1;
                                        return (
                                            <tr key={subscription.account.bump} className="transition hover:bg-white/5 cursor-pointer border border-white/5 rounded-2xl" >
                                                <td className={`
                                                    px-6 py-2 text-xl text-gray-400
                                                    ${isFirstRow ? "rounded-tl-2xl" : ""}
                                                    ${isLastRow ? "rounded-bl-2xl" : ""}
                                                `}>
                                                    {tx.data}
                                                </td>
                                                <td className='px-6 py-2 text-xl text-gray-400 '>
                                                    100 OPOS
                                                </td>

                                                <td className={`
                                                        px-6 py-2 text-xl text-gray-400
                                                        ${isFirstRow ? "rounded-tr-2xl" : ""}
                                                        ${isLastRow ? "rounded-br-2xl" : ""}
                                                    `}>
                                                    {tx.status}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className='h-0.5 w-full bg-white/5' />

                        <div className='flex gap-2' >
                            <button
                                onClick={() => updateSubscription(subscription.publicKey, "autoRenew", !subscription.account.autoRenew, subscription.account.payer)}
                                className={`flex justify-center ${!subscription.account.autoRenew ? "text-blue-400" : "text-red-400"} p-4 bg-white/5 w-full items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold`}>
                                {/* <Ban className="w-5 h-5" /> */}
                                {!subscription.account.autoRenew ? <span className='flex justify-center items-center gap-2' >
                                    <CircleCheck className="w-5 h-5" /> Enable   </span> : <span className='flex justify-center items-center gap-2'>
                                    <Ban className="w-5 h-5" /> Disable   </span>}
                                Auto-Renew
                                {/* {subscription.account.autoRenew ? "Enabled" : "Disabled"} */}
                            </button>

                            <button
                                onClick={() => updateSubscription(subscription.publicKey, "active", !subscription.account.active, subscription.account.payer)}
                                className={` ${!subscription.account.active ? "text-blue-400" : "text-red-400"}  p-4 bg-white/5 w-full flex justify-center items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold`}>
                                {subscription.account.active ? <span className='flex justify-center items-center gap-2' >
                                    <Pause className="w-5 h-5" /> Pause   </span>
                                    : <span className='flex justify-center items-center gap-2'>
                                        <Play className="w-5 h-5" /> Activate   </span>}
                                Subscription
                            </button>

                            <button className='flex justify-center text-blue-400 p-4 bg-white/5 w-full items-center gap-2 transition-shadow hover:shadow-xl rounded-xl font-semibold' onClick={() => { setPopupOpen(true); onClose() }} >
                                <Wallet size={20} />
                                Manage Balance
                            </button>
                        </div>

                        {/* </div> */}
                    </div>
                </div>
                {/* <div className='h-0.5 w-full bg-white/5 flex' /> */}


                {/* <div className='grid grid-cols-3 gap-4' >
                    <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl text-lg font-semibold' onClick={() => { setPopupAction("withdraw"); setPopupOpen(true); onClose() }}  > <CircleArrowUp /> Withdraw </button>
                    <StatCard title='Balance' value={subscription.account.prefundedAmount.toString()} icon={Timer} />
                    <button className='flex justify-center items-center gap-2 text-blue-400 transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl text-lg font-semibold' onClick={() => { setPopupAction("fund"); setPopupOpen(true); onClose() }} > <CircleArrowDown /> Fund </button>
                </div> */}

                <div className='h-0.5 w-full bg-white/5 flex' />
                {/* <div className="flex justify-between"> */}

                <button
                    onClick={() => cancelSubscription(subscription.account.payer, subscription.account.uniqueSeed, subscription.account.mint, subscription.account.vaultTokenAccount)}
                    className={` text-center group flex justify-center m-auto items-center gap-3 p-4 rounded-xl text-lg bg-white/5 text-red-400 transition cursor-pointer`}>
                    <Trash className="w-5 h-5" />
                    Delete
                </button>
                {/* </div> */}
            </div>

        </div >
    )
}

export default SubscriptionDetails


const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, }) => (
    <div className={`w-full space-y-2 justify-between transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl`}>
        {/* <div className='w-full'> */}
        <p className="text-sm font-medium text-gray-400 uppercase">{title}</p>
        <p className="text-xl = w-full rounded-xl font-semibold ">{value}</p>
        {/* </div> */}
        {/* <button className="p-3.5 bg-white/10 rounded-r-xl cursor-pointer">
            <Pencil className="w-4 text-blue-400" />
        </button> */}
    </div>
);
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { StatCardProps, Subscription } from '@/app/types';
import { formatPeriod } from '@/app/utils/duration';
import { Banknote, CircleArrowDown, CircleArrowUp, Pencil, Timer, Trash } from 'lucide-react';

const SubscriptionDetails = ({ isOpen, subscription, onClose }: { isOpen: boolean, subscription: Subscription, onClose: () => void }) => {

    const modalClasses = isOpen
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-4 scale-95 pointer-events-none';

    const { cancelSubscription } = useProgramActions();
    console.log("subscription", subscription)
    const currentTier = subscription?.planMetaData.tiers.find((tier) => tier.tierName == subscription.tierName)
    const handleClose = () => {
        // if (!isMutating) {
        onClose();
        setTimeout(() => {
            // setSuccessPDA(null);
            // setFormData(initialFormState);
        }, 300);
    }
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white-900/50 transition-opacity duration-300"
            onClick={handleClose}
        >
            <div
                className={`bg-white/5 rounded-xl shadow-2xl w-full max-w-3xl transition-all duration-300 ease-out ${modalClasses} p-6 space-y-4`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className=" flex justify-between items-center ">
                    <h2 className="text-2xl font-bold text-white ">
                        {subscription.planMetaData.name}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    // disabled={isMutating}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className='h-0.5 w-full bg-white/5' />

                <StatCard title='Created By' value={subscription.planMetaData.creator.toBase58()} icon={Banknote} />
                <StatCard title='Reciever' value={subscription.planMetaData.receiver.toBase58()} icon={Banknote} />
                <div className='flex justify-between'>
                    <h6 className='text-xl font-bold'>Tier</h6>
                </div>
                <div className='h-0.5 w-full bg-white/5' />

                <div className='grid grid-cols-3 gap-4' >
                    <StatCard title='Name' value={currentTier?.tierName} icon={Timer} />
                    <StatCard title='Amount' value={currentTier?.amount.toString()} icon={Banknote} />
                    <StatCard title='Duration' value={formatPeriod(currentTier?.periodSeconds)} icon={Timer} />
                </div>
                <StatCard title='Description' value={currentTier?.description} icon={Banknote} />
                <div className='h-0.5 w-full bg-white/5' />

                <div className='grid grid-cols-3 gap-4' >
                    <button className='flex justify-center text-blue-400 items-center gap-2 transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl text-lg font-semibold' > <CircleArrowUp /> Withdraw </button>
                    <StatCard title='Balance' value={subscription.prefundedAmount.toString()} icon={Timer} />
                    <button className='flex justify-center items-center gap-2 text-blue-400 transition-shadow hover:shadow-xl bg-white/5 p-3 rounded-xl text-lg font-semibold' > <CircleArrowDown /> Fund </button>
                </div>

                <div className='h-0.5 w-full bg-white/5' />
                <button
                    onClick={() => cancelSubscription(subscription.payer, subscription.uniqueSeed, subscription.mint, subscription.vaultTokenAccount)}
                    className={` text-center group flex items-center m-auto gap-3 p-4 rounded-xl text-lg bg-white/5 text-red-400 transition cursor-pointer`}>
                    <Trash className="w-5 h-5" />
                    Delete
                </button>
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
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { StatCardProps, Subscription } from '@/app/types';
import { formatPeriod } from '@/app/utils/duration';
import { Banknote, Pencil, Timer, Trash } from 'lucide-react';

const SubscriptionDetails = ({ isOpen, subscription, onClose }: { isOpen: boolean, subscription: Subscription, onClose: () => void }) => {
    const modalClasses = isOpen
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-4 scale-95 pointer-events-none';

    const { cancelSubscription } = useProgramActions();

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
                className={`bg-white/5 rounded-xl shadow-2xl w-full max-w-3xl transition-all duration-300 ease-out ${modalClasses} p-6 space-y-6`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className=" dark:border-gray-700 flex justify-between items-center ">
                    <h2 className="text-2xl font-bold text-white ">
                        {subscription.name}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    // disabled={isMutating}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <StatCard title='Reciever' value={subscription.payee.toBase58()} icon={Banknote} />
                <StatCard title='Balance' value={subscription.prefundedAmount.toString()} icon={Timer} />
                <div className='grid grid-cols-2 gap-4' >
                    <StatCard title='Name' value={subscription.name} icon={Timer} />
                    <StatCard title='Auto Renew' value={subscription.autoRenew.toString() ? "Enabled" : "Disabled"} icon={Timer} />
                    <StatCard title='Token' value={subscription.tokenMetadata.symbol.toString()} icon={Timer} />
                    <StatCard title='Amount' value={subscription.amount.toString()} icon={Banknote} />
                    <StatCard title='Status' value={subscription.active.toString() ? "Active" : "Unactive"} icon={Banknote} />
                    <StatCard title='Duration' value={formatPeriod(subscription.periodSeconds)} icon={Timer} />
                </div>
                <div className='h-0.5 w-full bg-white/5' />
                <button
                    onClick={() => cancelSubscription(subscription.payer, subscription.uniqueSeed, subscription.mint, subscription.vaultTokenAccount)}
                    className={` text-center group flex items-center m-auto gap-3 p-4 rounded-xl text-lg bg-white/5 text-red-400 transition cursor-pointer`}>
                    <Trash className="w-5 h-5" />
                    Delete
                </button>
            </div>
        </div>
    )
}

export default SubscriptionDetails


const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, }) => (
    <div className={`w-full  flex items-end justify-between transition-shadow hover:shadow-xl`}>
        <div className='w-full'>
            <p className="text-sm font-medium text-gray-400 uppercase">{title}</p>
            <p className="text-xl p-3 bg-white/5  w-full rounded-l-xl shadow-lg font-semibold mt-1">{value}</p>
        </div>
        <button className="p-3.5 bg-white/10 rounded-r-xl cursor-pointer">
            <Pencil className="w-4 text-blue-400" />
        </button>
    </div>
);
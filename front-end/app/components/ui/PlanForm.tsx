import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react'; // Assuming headlessui is available or similar modal logic
import InputGroup from './Input';

// Mock Web3/Anchor logic (replace with your actual createPlan call)
// const mockCreatePlan = async (data) => {
//     console.log("Submitting Plan Data:", data);
//     await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
//     return "PlanCreatedSuccessHash123";
// };

const PlanForm = ({ isOpen, setIsOpen }) => {
    // const [isOpen, setIsOpen] = useState(false); // Controls modal visibility

    const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
        defaultValues: {
            planName: "",
            tiers: [
                { tierName: "Basic", amount: 10, periodSeconds: 2592000, token: "" } // Default to 30 days
            ]
        }
    });

    // Use Field Array for dynamic tiers
    const { fields, append, remove } = useFieldArray({
        control,
        name: "tiers"
    });

    const [status, setStatus] = useState({ type: null, message: null });

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setIsOpen(false);
        reset(); // Optional: reset form on close
        setStatus({ type: null, message: null });
    };

    const onSubmit = async (data) => {
        // setStatus({ type: null, message: null });
        // try {
        //     // In a real app, you'd get the creator's key from useWallet()
        //     const creatorKey = "MockCreatorKey...";

        //     // Format data for the blockchain function
        //     // Note: Token address validation would happen here or in the hook
        //     await mockCreatePlan(data);

        //     setStatus({ type: 'success', message: `Plan "${data.planName}" created successfully!` });
        //     // Optional: Close modal after success or keep open to show message
        //     // setTimeout(closeModal, 2000); 
        // } catch (e) {
        //     setStatus({ type: 'error', message: "Failed to create plan. Please try again." });
        // }
    };

    return (
        <>
            {/* Trigger Button */}
            {/* <button
                onClick={openModal}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-blue-400 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-colors"
            >
                <Plus className="w-5 h-5" />
                <span>Create New Plan</span>
            </button> */}

            {/* Modal/Dialog */}
            <Transition show={isOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-50 font-mono" onClose={closeModal}>
                    {/* Backdrop */}
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 backdrop-blur-sm" />
                    </Transition.Child>

                    {/* Modal Panel */}
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 ">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="w-full max-w-3xl transform rounded-xl bg-white/5 p-6 transition-all font-inter text-white relative space-y-4">

                                    {/* Close Button */}
                                    {/* <button
                                        onClick={closeModal}
                                        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button> */}

                                    {/* Header */}
                                    <DialogTitle as="div" className="">
                                        <div className=" dark:border-gray-700 flex justify-between items-center ">
                                            <h2 className="text-2xl font-bold text-white ">
                                                Create Plan
                                            </h2>
                                            <button
                                                onClick={closeModal}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                                            // disabled={isMutating}
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>
                                    </DialogTitle>
                                    <div className='h-0.5 w-full bg-white/5' />

                                    {/* Status Messages */}
                                    {/* {status.message && (
                                        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${status.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                                            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                            <span>{status.message}</span>
                                        </div>
                                    )} */}

                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                        {/* Plan Name Section */}
                                        <InputGroup label='Name' name='name' onChange={() => "lol"} placeholder='e.g. Spotify' value={""} />
                                        {errors.planName && <p className="text-red-400 text-xs mt-2 ml-1">{errors.planName.message}</p>}
                                        {/* Tiers Section */}
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                                <label className="block  font-semibold text-gray-300 uppercase tracking-wider">Subscription Tiers</label>
                                                <button
                                                    type="button"
                                                    onClick={() => append({ tierName: "", amount: 0, periodSeconds: 2592000, token: "" })}
                                                    className=" flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Tier
                                                </button>
                                            </div>

                                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="rounded-2xl  hover:border-gray-600 transition-colors relative group">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5  rounded-xl">
                                                            <InputGroup label='Tier Name' name='name' onChange={() => "lol"} placeholder='e.g. Basic / Pro' value={""} />
                                                            <InputGroup label='Token Mint Address' name='name' onChange={() => "lol"} placeholder='Public Key (USDC, etc.)' value={""} />
                                                            <InputGroup label='Price (Raw Amount)' name='name' onChange={() => "lol"} placeholder='0.00' value={""} />
                                                            <InputGroup label='Duration (Seconds)' name='name' onChange={() => "lol"} placeholder='2592000 (30 Days)' value={""} />
                                                        </div>

                                                        {/* Remove Button */}
                                                        {/* {fields.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => remove(index)}
                                                                className="absolute -top-3 -right-3 bg-gray-700 hover:bg-red-500 text-gray-300 hover:text-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Remove Tier"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )} */}

                                                    </div>

                                                ))}
                                            </div>
                                        </div>

                                        {/* Submit Action */}
                                        <div className="">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-blue-400 hover:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Creating Plan...
                                                    </>
                                                ) : (
                                                    "Launch Plan"
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </DialogPanel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default PlanForm;
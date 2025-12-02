import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import InputGroup from './Input';
import { FormElement, Plan } from '@/app/types';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { useProgram } from '@/app/hooks/useProgram';

const initialFormState: Plan = {
    name: "",
    token: "",
    reciever: "",
    tiers: [
        { name: "", amount: undefined, periodSeconds: undefined, description: "" } // Default to 30 days
    ]
};


const PlanForm = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: any }) => {
    // const [isOpen, setIsOpen] = useState(false); // Controls modal visibility
    const [formData, setFormData] = useState<Plan>(initialFormState);
    const [isLoading, setLoading] = useState<boolean>()
    const [status, setStatus] = useState({ type: null, message: null });
    const { publicKey } = useProgram()
    const { createPlan } = useProgramActions()

    const closeModal = () => {
        setIsOpen(false);
        // reset(); // Optional: reset form on close
        setStatus({ type: null, message: null });
    };
    const tiersContainerRef = useRef<HTMLDivElement>(null);
    // Auto-scroll when tiers change
    useEffect(() => {
        tiersContainerRef.current?.scrollTo({
            top: tiersContainerRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [formData.tiers.length]); // ← triggers when a tier is added/removed
    const handleChange = (e: React.ChangeEvent<FormElement>, index: number) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            tiers: prev.tiers.map((tier, i) =>
                i === index
                    ? { ...tier, [name]: value }
                    : tier
            )
        }));
    };


    return (
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

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    createPlan(publicKey!, formData)
                                }} className="space-y-8">
                                    {/* Plan Name Section */}
                                    <InputGroup label='Name' name='name' onChange={({ target }) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            name: target.value
                                        }))
                                    } placeholder='e.g. Spotify' value={formData.name} />
                                    <InputGroup label='Reciever Address' name='reciever' onChange={({ target }) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            reciever: target.value
                                        }))
                                    } placeholder='e.g. Spotify' value={formData.reciever} />
                                    <InputGroup label='Token Address' name='token' onChange={({ target }) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            token: target.value
                                        }))
                                    } placeholder='e.g. Spotify' value={formData.token} />

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center ">
                                            <label className="block font-bold tracking-wider text-xl">Tiers</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData((e) => ({ name: e.name, reciever: e.reciever, token: e.token, tiers: [...e.tiers, initialFormState.tiers[0]] }))}
                                                className=" flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" /> Add Tier
                                            </button>
                                        </div>
                                        <div className='h-0.5 bg-white/5 w-full' />

                                        <div ref={tiersContainerRef} className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar px-1">
                                            {formData.tiers.map((field, index) => (
                                                <div key={index} className="rounded-2xl  hover:border-gray-600 transition-colors relative group space-y-4">
                                                    <div className='flex justify-between items-center'>
                                                        <p className='font-bold text-lg text-gray-300'>
                                                            Tier {index + 1}
                                                        </p>
                                                        {formData.tiers.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({
                                                                    ...prev,
                                                                    tiers: prev.tiers.filter((_, i) => i !== index)
                                                                }))}
                                                                className=" rounded-full shadow-lg transition-all cursor-pointer hover:text-red-400 text-gray-400"
                                                                title="Remove Tier"
                                                            >
                                                                <Trash2 className="w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5  rounded-xl">
                                                        <InputGroup label='Tier Name' value={field.name} name="name" onChange={(e) => handleChange(e, index)} placeholder='e.g. Basic / Pro' />
                                                        <InputGroup label='Price (Raw Amount)' type='number' value={field.amount} name='amount' onChange={(e) => handleChange(e, index)} placeholder='0.00' />
                                                        <InputGroup label='Duration (Seconds)' type='number' value={field.periodSeconds} name='periodSeconds' onChange={(e) => handleChange(e, index)} placeholder='2592000 (30 Days)' />
                                                        <InputGroup label='Description' value={field.description} name='description' textarea={true} onChange={(e) => handleChange(e, index)} placeholder='Describe the pros and cons of this plan' classNames='col-span-3' />
                                                    </div>
                                                    <div className='h-0.5 bg-white/5 w-full' />

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
                                            // disabled={isSubmitting}
                                            className="w-full bg-blue-400 hover:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                        >
                                            {isLoading ? (
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
    );
};

export default PlanForm;
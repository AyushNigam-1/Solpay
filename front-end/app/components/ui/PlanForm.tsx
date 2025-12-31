import React, { useEffect, useRef, useState } from 'react';
import { CirclePlus, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import InputGroup from './Input';
import { Plan } from '@/app/types';
import { useProgram } from '@/app/hooks/useProgram';
import { useMutations } from '@/app/hooks/useMutations';
import Loader from './Loader';

const initialFormState: Plan = {
    name: "",
    mint: "",
    tokenImage: "",
    tokenSymbol: "",
    token: "",
    receiver: "",
    tiers: [
        { tierName: "", amount: '', periodSeconds: "", description: "" } // Default to 30 days
    ]
};


const PlanForm = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: any }) => {
    // const [isOpen, setIsOpen] = useState(false); // Controls modal visibility
    const [formData, setFormData] = useState<Plan>(initialFormState);
    const [status, setStatus] = useState({ type: null, message: null });
    const { publicKey } = useProgram()
    // const { createPlan } = useProgramActions()
    const { createPlan } = useMutations()

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
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
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 scale-90 -translate-y-12"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-12"
                        >
                            <DialogPanel className="w-full max-w-3xl transform rounded-xl bg-white/5 p-6 transition-all font-inter text-white relative space-y-4 border border-gray-800 shadow-2xl">
                                <DialogTitle as="div" className="">
                                    <div className=" dark:border-gray-700 flex justify-between items-center ">
                                        <h2 className="text-2xl font-bold text-white ">
                                            Create Plan
                                        </h2>
                                        <button
                                            onClick={closeModal}
                                            className=" text-gray-400 hover:text-white transition-colors z-10 bg-white/5 rounded-full p-2 hover:bg-gray-700"
                                        // disabled={isMutating}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </DialogTitle>
                                <div className='h-0.5 w-full bg-white/5' />
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    createPlan.mutate({ creatorKey: publicKey!, plan: formData })
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
                                            receiver: target.value
                                        }))
                                    } placeholder='e.g. Spotify' value={formData.receiver} />

                                    <InputGroup label='Token Address' name='token' onChange={({ target }) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            token: target.value
                                        }))
                                    } placeholder='e.g. Spotify' value={formData.token as string} />

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center ">
                                            <label className="block font-bold tracking-wider text-xl">Tiers</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData((e) => ({ name: e.name, reciever: e.receiver, token: e.token, mint: e.mint, receiver: e.receiver, tokenImage: e.tokenImage, tokenSymbol: e.tokenSymbol, tiers: [...e.tiers, initialFormState.tiers[0]] }))}
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
                                                        <InputGroup label='Tier Name' value={field.tierName} name="tierName" onChange={(e) => handleChange(e, index)} placeholder='e.g. Basic / Pro' />
                                                        <InputGroup label='Price (Raw Amount)' type='number' value={field.amount as string} name='amount' onChange={(e) => handleChange(e, index)} placeholder='0.00' />
                                                        <InputGroup label='Duration (Seconds)' type='number' value={field.periodSeconds as string} name='periodSeconds' onChange={(e) => handleChange(e, index)} placeholder='2592000 (30 Days)' />
                                                        <InputGroup label='Description' value={field.description} name='description' textarea={true} onChange={(e) => handleChange(e, index)} placeholder='Describe the pros and cons of this plan' classNames='col-span-3' />
                                                    </div>
                                                    <div className='h-0.5 bg-white/5 w-full' />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="">
                                        <button
                                            type="submit"
                                            disabled={createPlan.isPending}
                                            className={` disabled:bg-white/5 bg-blue-400 text-white hover:bg-blue-400 w-full font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
                                        >
                                            {createPlan.isPending ?
                                                <Loader /> : <CirclePlus />
                                            }
                                            Create
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
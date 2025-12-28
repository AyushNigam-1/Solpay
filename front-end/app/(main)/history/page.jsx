import Header from '@/app/components/ui/Header';
import Loader from '@/app/components/ui/Loader';
const page = () => {
    return (
        <div className='space-y-4 font-mono'>
            <Header title="Marketplace" setOpen={setOpen} refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <div className=''>
                {isLoading || isFetching ? (
                    <Loader />
                ) :
                    isQueryError ? <Error refetch={refetch} /> :
                        (filteredData?.length != 0) ?
                            <>
                                <div className="relative overflow-x-auto shadow-xs rounded-lg ">
                                    <table className="w-full table-fixed text-sm text-left rtl:text-right text-body">
                                        <TableHeaders columns={headers} />
                                        <tbody>
                                            {filteredData!.map((plan) => {
                                                return (
                                                    <tr key={plan.account.bump} className="border-t-0 border-2  border-white/5"
                                                    //  onClick={() => { setSubscription(subscription.account); setOpenDetails(true) }}
                                                    >
                                                        <td className="px-6 py-2 text-xl font-semibold text-white">
                                                            {plan.account.name}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {plan.account.creator?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400 ">
                                                            {plan.account.receiver?.toString().slice(0, 10)}...
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="flex items-end gap-2 ">
                                                                <img
                                                                    src={plan.account.tokenImage}
                                                                    className='w-6 rounded-full object-cover'
                                                                // alt={`${subscription.account.tokenMetadata.symbol} icon`}
                                                                />
                                                                <p className="text-xl text-gray-400">
                                                                    {plan.account.tokenSymbol}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 text-xl text-gray-400">
                                                            {plan.account.tiers.length}
                                                        </td>
                                                        <td className="px-6 py-2 text-xl ">
                                                            {
                                                                plan.account.creator?.toString() == publicKey ? <button className='flex gap-2 items-center text-red-400' onClick={() => cancelPlan(plan.account.creator!)}>
                                                                    <Trash className='size-5' />
                                                                    Delete
                                                                </button> : <button className='flex gap-2 items-center hover:text-blue-500 cursor-pointer text-blue-400' onClick={() => { setPlan(plan.account); setPlanPDA(plan.publicKey); setOpenDetails(true) }}>
                                                                    <Zap className="w-5 h-5 " />
                                                                    Subscribe
                                                                </button>
                                                            }

                                                            {/* {subscription.account.active ? "Active" : "Disabled"} */}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                            :
                            !searchQuery && <p className='text-center col-span-4 text-gray-400 text-2xl'>No active plans found.</p>
                }
                {filteredData?.length === 0 && searchQuery && (
                    <div className="lg:col-span-4 p-8 rounded-xl text-center text-gray-400">
                        <p className="text-xl font-medium font-mono">No Plans found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
            {/* <PlanForm isOpen={isOpen} setIsOpen={setOpen} /> */}
            {/* <SubscriptionForm isOpen={isOpen} onClose={() => setOpen(false)} /> */}
            {/* <PlanDetails plan={plan!} planPDA={planPDA!} open={openDetails} setOpen={setOpenDetails} type="new" /> */}
        </div>
    )
}

export default page
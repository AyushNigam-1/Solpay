"use client"

import Header from '@/app/components/ui/Header';
import PlanForm from '@/app/components/ui/PlanForm';
// import { SubscriptionForm } from '@/app/components/ui/SubscriptionForm';
import { useProgramActions } from '@/app/hooks/useProgramActions';
import { Plans } from '@/app/types';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

const page = () => {

    const [searchQuery, setSearchQuery] = useState<string | null>("")
    const [isOpen, setOpen] = useState<boolean>(false)

    const { fetchAllSubscriptionPlans } = useProgramActions();
    const {
        data: plans,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery<Plans[]>({
        queryKey: ["AllPlans"],
        queryFn: () => fetchAllSubscriptionPlans(),
        staleTime: 1000 * 3000,
    });


    return (
        <div>

            <Header title="Marketplace" setOpen={setOpen} refetch={refetch} isFetching={isFetching} setSearchQuery={setSearchQuery} />
            <PlanForm isOpen={isOpen} setIsOpen={setOpen} />
            {/* <SubscriptionForm isOpen={isOpen} onClose={() => setOpen(false)} /> */}

        </div>
    )
}

export default page
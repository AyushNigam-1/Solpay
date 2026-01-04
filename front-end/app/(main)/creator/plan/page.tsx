"use client"

import { useProgramActions } from '@/app/hooks/useProgramActions';
import { useQuery } from '@tanstack/react-query';

const page = () => {
    const { getMyPlan } = useProgramActions();

    const {
        data: plan,
        isLoading,
        isFetching,
        isError: isQueryError,
        refetch,
    } = useQuery({
        queryKey: ["plan"],
        queryFn: async () => await getMyPlan(),
        staleTime: 1000 * 3000,
    });
    console.log(plan)
    return (
        <div>page</div>
    )
}

export default page
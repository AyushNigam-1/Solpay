"use client"
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useActions } from "../../hooks/useActions"

const page = () => {
    const { fetchUserSubscriptions } = useActions()

    const { data, isLoading, isFetching, refetch, isError } = useQuery({
        queryKey: ["GlobalStats"],
        queryFn: () => fetchUserSubscriptions(),
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div>{isLoading ? "lol" : "none"} {isError ? isError : "none"}</div>
    )
}

export default page
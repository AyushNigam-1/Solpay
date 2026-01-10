import { useState, useMemo } from 'react';

// This generic hook works for any data type (T)
export function useSearch<T>(data: T[] | undefined, filterKeys: (keyof T)[]) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = useMemo(() => {
        // If no data or no search query, return original data
        if (!data) return [];
        if (!searchQuery) return data;

        const lowerCaseQuery = searchQuery.toLowerCase().trim();

        return data.filter((item) => {
            // Check if ANY of the passed keys (e.g., 'plan', 'tier') match the query
            return filterKeys.some((key) => {
                const value = item[key];
                // Convert to string safely and check for inclusion
                return value ? String(value).toLowerCase().includes(lowerCaseQuery) : false;
            });
        });
    }, [data, searchQuery, filterKeys]);

    return {
        searchQuery,
        setSearchQuery,
        filteredData
    };
}
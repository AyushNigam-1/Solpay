import { BN } from "@coral-xyz/anchor";

export function formatPeriod(seconds: BN | number | string): string {
    // Convert to number (handle BN, string, number)
    const secs = typeof seconds === "object"
        ? Number(seconds.toString())
        : Number(seconds);

    if (isNaN(secs) || secs <= 0) return "Invalid period";

    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },  // 30 days
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
        { label: "second", seconds: 1 }
    ];

    for (const { label, seconds: unitSecs } of intervals) {
        if (secs >= unitSecs) {
            const value = Math.floor(secs / unitSecs);
            return `${value} ${label}${value !== 1 ? "s" : ""}`;
        }
    }

    return "less than a second";
}
import { BN } from "@coral-xyz/anchor";

export function formatPeriod(periodBN: BN): string {
    // Constants in seconds
    const SECOND = 1;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    // Approximations (using average month length is common if exact calendar months aren't required)
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    // Convert BN to a standard JavaScript number (safe since subscription periods are usually within i53 limits)
    const totalSeconds = periodBN.toNumber();

    // FIX: Check for 0 or negative values immediately
    if (totalSeconds <= 0) {
        return "2 Hour";
    }

    if (totalSeconds >= YEAR && (totalSeconds % YEAR) === 0) {
        const years = totalSeconds / YEAR;
        return `${years} Year${years > 1 ? 's' : ''}`;
    }

    if (totalSeconds >= MONTH && (totalSeconds % MONTH) === 0) {
        const months = totalSeconds / MONTH;
        return `${months} Month${months > 1 ? 's' : ''}`;
    }

    if (totalSeconds >= WEEK && (totalSeconds % WEEK) === 0) {
        const weeks = totalSeconds / WEEK;
        return `${weeks} Week${weeks > 1 ? 's' : ''}`;
    }

    if (totalSeconds >= DAY && (totalSeconds % DAY) === 0) {
        const days = totalSeconds / DAY;
        return `${days} Day${days > 1 ? 's' : ''}`;
    }

    if (totalSeconds >= HOUR && (totalSeconds % HOUR) === 0) {
        const hours = totalSeconds / HOUR;
        return `${hours} Hour${hours > 1 ? 's' : ''}`;
    }

    if (totalSeconds >= MINUTE && (totalSeconds % MINUTE) === 0) {
        const minutes = totalSeconds / MINUTE;
        return `${minutes} Minute${minutes > 1 ? 's' : ''}`;
    }

    // Fallback to displaying raw seconds if it doesn't align neatly
    return `${totalSeconds} Second${totalSeconds !== 1 ? 's' : ''}`;
}
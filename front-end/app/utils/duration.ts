import BN from "bn.js";

export function formatPeriod(secondsBN: BN): string {
    const MINUTE = new BN(60);
    const HOUR = new BN(3600);
    const DAY = new BN(86400);
    const WEEK = new BN(604800);
    const MONTH = new BN(2592000);
    const YEAR = new BN(31536000);

    if (secondsBN.lte(new BN(0))) {
        return "Due";
    }

    if (secondsBN.mod(YEAR).isZero()) {
        return `${secondsBN.div(YEAR).toString()} Years`;
    }
    if (secondsBN.mod(MONTH).isZero()) {
        return `${secondsBN.div(MONTH).toString()} Months`;
    }
    if (secondsBN.mod(WEEK).isZero()) {
        return `${secondsBN.div(WEEK).toString()} Weeks`;
    }
    if (secondsBN.mod(DAY).isZero()) {
        return `${secondsBN.div(DAY).toString()} Days`;
    }
    if (secondsBN.mod(HOUR).isZero()) {
        return `${secondsBN.div(HOUR).toString()} Hours`;
    }
    if (secondsBN.mod(MINUTE).isZero()) {
        return `${secondsBN.div(MINUTE).toString()} Minutes`;
    }

    return `${secondsBN.toString()} Seconds`;
}




export const formatDate = (isoString: string): string => {
    if (!isoString) return "";

    const date = new Date(isoString);

    const year = date.getFullYear();
    // getMonth() is 0-indexed, so we add 1. padStart ensures "09" instead of "9"
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
};

export function timeRemainingUntil(nextPaymentTs: BN): string {
    // Current time in seconds
    const now = Math.floor(Date.now() / 1000);
    console.log("nextPaymentTs", nextPaymentTs)
    // Convert BN to number (safe for timestamps up to year ~3000)
    const nextTs = nextPaymentTs.toNumber();

    // Difference in seconds
    const diffSeconds = nextTs - now;

    if (diffSeconds <= 0) {
        return "Expired";
    }

    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30; // approximate
    const year = day * 365;

    if (diffSeconds >= year) {
        const years = Math.floor(diffSeconds / year);
        return `${years} Year${years > 1 ? "s" : ""} Left`;
    }

    if (diffSeconds >= month) {
        const months = Math.floor(diffSeconds / month);
        return `${months} Month${months > 1 ? "s" : ""} Left`;
    }

    if (diffSeconds >= day) {
        const days = Math.floor(diffSeconds / day);
        return `${days} Day${days > 1 ? "s" : ""} Left`;
    }

    if (diffSeconds >= hour) {
        const hours = Math.floor(diffSeconds / hour);
        return `${hours} Hours${hours > 1 ? "s" : ""} Left`;
    }

    const minutes = Math.floor(diffSeconds / minute);
    return `${minutes} Minute${minutes > 1 ? "s" : ""} Left`;
}

const safeToNumber = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return Number(val);
    // Check if it's an Anchor BN (has .toNumber method)
    if (val.toNumber) {
        try {
            return val.toNumber();
        } catch (e) {
            return 0; // Fallback if number is too large for JS Number
        }
    }
    // Check if it has _bn property (internal BN representation)
    if (val._bn) {
        // We can't easily access internal _bn without re-wrapping, 
        // better to assume the parent passes a valid BN or string.
        // Attempting to stringify:
        return Number(val.toString());
    }
    return 0;
};

export const formatDuration = (val: any) => {
    const seconds = safeToNumber(val);
    if (!seconds) return "Unknown Duration";
    const days = Math.floor(seconds / (3600 * 24));
    if (days >= 30) return `${Math.floor(days / 30)} Month(s)`;
    if (days >= 7) return `${Math.floor(days / 7)} Week(s)`;
    return `${days} Day(s)`;
};
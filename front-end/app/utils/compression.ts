import pako from 'pako';
import BN from "bn.js";
import * as borsh from "borsh";

export class SubscriptionTier {
    tier_name: string;
    amount: BN;
    period_seconds: number;

    constructor(fields: {
        tier_name: string;
        amount: BN | number | string;
        period_seconds: number;
    }) {
        this.tier_name = fields.tier_name;
        this.amount = BN.isBN(fields.amount)
            ? fields.amount
            : new BN(fields.amount);
        this.period_seconds = fields.period_seconds;
    }
}

export function jsonToBorshSubscriptionTiers(
    json: any[],
): Uint8Array {
    if (!Array.isArray(json)) {
        throw new Error("Expected an array of tiers");
    }

    // Validate + normalize
    const tiers = json.map((t, i) => {
        if (
            typeof t.tier_name !== "string" ||
            t.amount === undefined ||
            typeof t.period_seconds !== "number"
        ) {
            throw new Error(`Invalid tier at index ${i}`);
        }

        return new SubscriptionTier({
            tier_name: t.tier_name,
            amount: new BN(t.amount),
            period_seconds: t.period_seconds,
        });
    });

    // Serialize Vec<SubscriptionTier>
    return borsh.serialize(
        new Map([
            [
                Array,
                {
                    kind: "seq",
                    type: SubscriptionTier,
                },
            ],
        ]),
        tiers,
    );
}


export const compressData = (data: any): Uint8Array => {
    try {
        const jsonString = jsonToBorshSubscriptionTiers(data);
        const compressed = pako.deflate(jsonString);
        return compressed;
    } catch (err) {
        console.error("Compression failed:", err);
        throw new Error("Failed to compress data");
    }
};


export function decompressBorshBytes(
    compressed: Uint8Array | Buffer | number[],
): Uint8Array {
    const input =
        compressed instanceof Uint8Array
            ? compressed
            : new Uint8Array(compressed);

    return pako.inflate(input);
}
/**
 * Decompresses a Uint8Array (from on-chain) back into the original JSON object.
 */
export const decompressData = <T>(compressedData: Uint8Array | Buffer | number[]): T | null => {
    try {
        // Ensure input is a Uint8Array
        const data = compressedData instanceof Uint8Array
            ? compressedData
            : new Uint8Array(compressedData);

        const decompressedString = pako.inflate(data, { to: 'string' });
        return JSON.parse(decompressedString) as T;
    } catch (err) {
        console.error("Decompression failed:", err);
        return null;
    }
};
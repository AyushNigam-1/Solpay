import pako from 'pako';

export const compressData = (data: any): Uint8Array => {
    try {
        const jsonString = JSON.stringify(data);
        const compressed = pako.deflate(jsonString);
        return compressed;
    } catch (err) {
        console.error("Compression failed:", err);
        throw new Error("Failed to compress data");
    }
};

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
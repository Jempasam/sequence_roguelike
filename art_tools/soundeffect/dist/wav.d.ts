/** Minimal PCM WAV encoder / decoder (16-bit), no dependency. */
export interface DecodedWav {
    sampleRate: number;
    channels: Float32Array[];
}
/** Float channels in -1..1 → bytes of a 16-bit PCM WAV file. */
export declare function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array;
/** Decode a PCM (16/24/32-bit int or 32-bit float) WAV file. */
export declare function decodeWav(bytes: Uint8Array): DecodedWav;

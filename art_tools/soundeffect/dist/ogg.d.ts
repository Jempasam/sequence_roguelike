/** Approximate Vorbis VBR quality that yields the given average bitrate. */
export declare function oggQuality(kbps: number): number;
/**
 * Float channels (mono or stereo) → bytes of an Ogg Vorbis file.
 *
 * Unlike MP3, Ogg adds no silence before the first sample, which suits short effects.
 */
export declare function encodeOgg(channels: Float32Array[], sampleRate: number, kbps?: number): Promise<Uint8Array>;
/** Decode an Ogg Vorbis file into float channels. */
export declare function decodeOgg(bytes: Uint8Array): Promise<{
    sampleRate: number;
    channels: Float32Array[];
}>;

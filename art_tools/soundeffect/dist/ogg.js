import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";
import { createOggEncoder } from "wasm-media-encoders";
/** Vorbis quality (0 to 9) for a bitrate in kb/s: the highest quality whose usual bitrate does not exceed it. */
const QUALITY_BY_KBPS = [
    [64, 0], [80, 1], [96, 2], [112, 3], [128, 4], [160, 5], [192, 6], [224, 7], [256, 8], [320, 9],
];
/** Approximate Vorbis VBR quality that yields the given average bitrate. */
export function oggQuality(kbps) {
    let quality = -1;
    for (const [rate, q] of QUALITY_BY_KBPS)
        if (kbps >= rate)
            quality = q;
    return quality;
}
/**
 * Float channels (mono or stereo) → bytes of an Ogg Vorbis file.
 *
 * Unlike MP3, Ogg adds no silence before the first sample, which suits short effects.
 */
export async function encodeOgg(channels, sampleRate, kbps = 128) {
    if (channels.length < 1 || channels.length > 2)
        throw new Error(`Ogg needs 1 or 2 channels, got ${channels.length}`);
    const encoder = await createOggEncoder();
    encoder.configure({ channels: channels.length, sampleRate, vbrQuality: oggQuality(kbps) });
    const chunks = [];
    const block = 65536;
    for (let i = 0; i < channels[0].length; i += block) {
        const part = encoder.encode(channels.map(c => c.subarray(i, i + block)));
        if (part.length)
            chunks.push(part.slice());
    }
    chunks.push(encoder.finalize().slice());
    const bytes = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}
/** Decode an Ogg Vorbis file into float channels. */
export async function decodeOgg(bytes) {
    if (bytes.length < 4 || String.fromCharCode(...bytes.subarray(0, 4)) !== "OggS")
        throw new Error("not an Ogg file");
    const decoder = new OggVorbisDecoder();
    await decoder.ready;
    try {
        const decoded = await decoder.decodeFile(bytes);
        if (decoded.channelData.length === 0)
            throw new Error("Ogg file has no audio (is it Vorbis?)");
        return { sampleRate: decoded.sampleRate, channels: decoded.channelData };
    }
    finally {
        await decoder.free();
    }
}

import { Mp3Encoder } from "@breezystack/lamejs";
const toInt16 = (source) => {
    const out = new Int16Array(source.length);
    for (let i = 0; i < source.length; i++) {
        const c = Math.max(-1, Math.min(1, source[i]));
        out[i] = c < 0 ? Math.round(c * 0x8000) : Math.round(c * 0x7fff);
    }
    return out;
};
/**
 * Float channels (mono or stereo) → bytes of an MP3 file.
 *
 * MP3 encoders add a little silence before the first sample (the encoder delay) and the format
 * cannot loop seamlessly: render to WAV for a sound that has to loop.
 */
export function encodeMp3(channels, sampleRate, kbps = 128) {
    if (channels.length < 1 || channels.length > 2)
        throw new Error(`MP3 needs 1 or 2 channels, got ${channels.length}`);
    const encoder = new Mp3Encoder(channels.length, sampleRate, kbps);
    const left = toInt16(channels[0]);
    const right = channels[1] ? toInt16(channels[1]) : undefined;
    const chunks = [];
    const block = 1152 * 16;
    for (let i = 0; i < left.length; i += block) {
        const part = right
            ? encoder.encodeBuffer(left.subarray(i, i + block), right.subarray(i, i + block))
            : encoder.encodeBuffer(left.subarray(i, i + block));
        if (part.length)
            chunks.push(part);
    }
    const tail = encoder.flush();
    if (tail.length)
        chunks.push(tail);
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

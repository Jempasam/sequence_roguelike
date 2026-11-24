/** Minimal PCM WAV encoder / decoder (16-bit), no dependency. */
const clamp16 = (v) => {
    const c = Math.max(-1, Math.min(1, v));
    return c < 0 ? Math.round(c * 0x8000) : Math.round(c * 0x7fff);
};
/** Float channels in -1..1 → bytes of a 16-bit PCM WAV file. */
export function encodeWav(channels, sampleRate) {
    const count = channels.length;
    const frames = channels[0]?.length ?? 0;
    const dataSize = frames * count * 2;
    const bytes = new Uint8Array(44 + dataSize);
    const view = new DataView(bytes.buffer);
    const text = (offset, value) => {
        for (let i = 0; i < value.length; i++)
            view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, count, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * count * 2, true);
    view.setUint16(32, count * 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < frames; i++) {
        for (let c = 0; c < count; c++) {
            view.setInt16(offset, clamp16(channels[c][i]), true);
            offset += 2;
        }
    }
    return bytes;
}
/** Decode a PCM (16/24/32-bit int or 32-bit float) WAV file. */
export function decodeWav(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tag = (offset) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE")
        throw new Error("not a WAV file");
    let format = 1, count = 1, sampleRate = 44100, bits = 16;
    let data;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
        const id = tag(offset);
        const size = view.getUint32(offset + 4, true);
        if (id === "fmt ") {
            format = view.getUint16(offset + 8, true);
            count = view.getUint16(offset + 10, true);
            sampleRate = view.getUint32(offset + 12, true);
            bits = view.getUint16(offset + 22, true);
        }
        else if (id === "data") {
            data = { start: offset + 8, size: Math.min(size, bytes.length - offset - 8) };
            break;
        }
        offset += 8 + size + (size & 1);
    }
    if (!data)
        throw new Error("WAV file has no data chunk");
    const bytesPer = bits / 8;
    const frames = Math.floor(data.size / (bytesPer * count));
    const channels = Array.from({ length: count }, () => new Float32Array(frames));
    for (let i = 0; i < frames; i++) {
        for (let c = 0; c < count; c++) {
            const at = data.start + (i * count + c) * bytesPer;
            let value;
            if (format === 3 && bits === 32)
                value = view.getFloat32(at, true);
            else if (bits === 16)
                value = view.getInt16(at, true) / 0x8000;
            else if (bits === 24)
                value = ((view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16))) / 0x800000;
            else if (bits === 32)
                value = view.getInt32(at, true) / 0x80000000;
            else
                throw new Error(`unsupported WAV bit depth ${bits}`);
            channels[c][i] = value;
        }
    }
    return { sampleRate, channels };
}

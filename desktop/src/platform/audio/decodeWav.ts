import { PcmSound } from "./PcmSound"

/** The format tag of integer PCM in a wav file. */
const FORMAT_PCM = 1

/** The format tag of float PCM in a wav file. */
const FORMAT_FLOAT = 3

/** The format tag meaning the real one is in the extension of the format chunk. */
const FORMAT_EXTENSIBLE = 0xfffe

/**
 * Decode the bytes of a wav file: PCM of 8, 16, 24 or 32 bits, or float of 32 or 64 bits, in any number of
 * channels (only the first two are kept).
 *
 * @throws {@link Error} When the bytes are not a wav file of these formats.
 */
export function decodeWav(bytes: Uint8Array): PcmSound {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const isWav = bytes.length >= 12 && tag(view, 0) === "RIFF" && tag(view, 8) === "WAVE"
    if(!isWav) throw new Error("Not a wav file.")

    // CHUNKS //
    let format = 0
    let channelCount = 0
    let sampleRate = 0
    let bits = 0
    let dataStart = -1
    let dataLength = 0
    for(let at = 12; at + 8 <= bytes.length;){
        const name = tag(view, at)
        const size = view.getUint32(at + 4, true)
        const body = at + 8
        if(name === "fmt "){
            format = view.getUint16(body, true)
            channelCount = view.getUint16(body + 2, true)
            sampleRate = view.getUint32(body + 4, true)
            bits = view.getUint16(body + 14, true)
            if(format === FORMAT_EXTENSIBLE && size >= 26) format = view.getUint16(body + 24, true)
        }
        else if(name === "data"){
            dataStart = body
            dataLength = Math.min(size, bytes.length - body)
            break
        }
        at = body + size + (size % 2)
    }
    if(dataStart < 0 || channelCount < 1 || sampleRate < 1) throw new Error("A wav file with no samples.")

    // SAMPLES //
    const reader = sampleReader(view, format, bits)
    const width = bits / 8
    const frames = Math.floor(dataLength / (width * channelCount))
    const kept = Math.min(channelCount, 2)
    const channels = Array.from({ length: kept }, () => new Float32Array(frames))
    for(let frame = 0; frame < frames; frame++){
        for(let channel = 0; channel < kept; channel++){
            channels[channel][frame] = reader(dataStart + (frame * channelCount + channel) * width)
        }
    }
    return new PcmSound(channels, sampleRate)
}

/** The four letters at an offset. */
function tag(view: DataView, offset: number): string {
    const codes = [0, 1, 2, 3].map(i => view.getUint8(offset + i))
    return String.fromCharCode(...codes)
}

/** A function reading the sample at a byte offset, as a number from -1 to 1. */
function sampleReader(view: DataView, format: number, bits: number): (offset: number) => number {
    if(format === FORMAT_PCM){
        if(bits === 8) return offset => (view.getUint8(offset) - 128) / 128
        if(bits === 16) return offset => view.getInt16(offset, true) / 32768
        if(bits === 24){
            return offset => {
                const low = view.getUint8(offset) | view.getUint8(offset + 1) << 8
                return (low | view.getInt8(offset + 2) << 16) / 8388608
            }
        }
        if(bits === 32) return offset => view.getInt32(offset, true) / 2147483648
    }
    if(format === FORMAT_FLOAT){
        if(bits === 32) return offset => view.getFloat32(offset, true)
        if(bits === 64) return offset => view.getFloat64(offset, true)
    }
    throw new Error(`A wav file of format ${format} in ${bits} bits is not read.`)
}

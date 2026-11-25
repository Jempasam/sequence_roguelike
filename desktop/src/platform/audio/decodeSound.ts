import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis"

import { decodeWav } from "./decodeWav"
import { PcmSound } from "./PcmSound"

/**
 * Decode the bytes of a sound file, wav or ogg Vorbis, by what they start with.
 *
 * @throws {@link Error} When the bytes are neither.
 */
export async function decodeSound(bytes: Uint8Array): Promise<PcmSound> {
    const start = String.fromCharCode(...bytes.subarray(0, 4))
    if(start === "RIFF") return decodeWav(bytes)
    if(start === "OggS") return decodeOgg(bytes)
    throw new Error("Not a wav or ogg file.")
}

/** Decode the bytes of an ogg Vorbis file. */
async function decodeOgg(bytes: Uint8Array): Promise<PcmSound> {
    const decoder = new OggVorbisDecoder()
    try {
        await decoder.ready
        const decoded = await decoder.decodeFile(bytes)
        if(decoded.samplesDecoded < 1) throw new Error("An ogg file with no samples.")
        return new PcmSound(decoded.channelData.slice(0, 2), decoded.sampleRate)
    }
    finally {
        decoder.free()
    }
}

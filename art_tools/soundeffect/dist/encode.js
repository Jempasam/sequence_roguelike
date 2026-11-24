import { encodeMp3 } from "./mp3.js";
import { encodeOgg } from "./ogg.js";
import { encodeWav } from "./wav.js";
export const FORMATS = ["mp3", "wav", "ogg"];
export const DEFAULT_FORMAT = "mp3";
export const DEFAULT_BITRATE = 128;
export async function encodeAudio(rendered, format, bitrate = DEFAULT_BITRATE) {
    if (format === "wav")
        return encodeWav(rendered.channels, rendered.sampleRate);
    if (format === "mp3")
        return encodeMp3(rendered.channels, rendered.sampleRate, bitrate);
    if (format === "ogg")
        return encodeOgg(rendered.channels, rendered.sampleRate, bitrate);
    throw new Error(`unknown format "${format}" (expected ${FORMATS.join(", ")})`);
}
const MIMES = { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" };
export const mimeOf = (format) => MIMES[format];

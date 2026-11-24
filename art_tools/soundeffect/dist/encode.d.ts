import type { Rendered } from "./engine.js";
export type Format = "mp3" | "wav" | "ogg";
export declare const FORMATS: readonly Format[];
export declare const DEFAULT_FORMAT: Format;
export declare const DEFAULT_BITRATE = 128;
export declare function encodeAudio(rendered: Pick<Rendered, "channels" | "sampleRate">, format: Format, bitrate?: number): Promise<Uint8Array>;
export declare const mimeOf: (format: Format) => string;

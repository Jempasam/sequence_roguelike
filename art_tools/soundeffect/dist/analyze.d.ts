/** Measurements on rendered audio — shared by the CLI (`inspect`) and the web editor. */
export interface Stats {
    sampleRate: number;
    channels: number;
    frames: number;
    duration: number;
    /** Highest absolute sample, linear. */
    peak: number;
    peakDb: number;
    rmsDb: number;
    /** Samples beyond ±1 (they would clip in a 16-bit file). */
    clipped: number;
    dcOffset: number;
    /** Level just before the final 5 ms fade, dBFS. A sound that ends cleanly is far below its peak there. */
    tailDb: number;
    /** Milliseconds of near-silence before the sound starts. */
    headSilenceMs: number;
    nonFinite: number;
    centroidHz: number;
    /** Peak level per time slice, dBFS. */
    envelope: number[];
}
/** In-place radix-2 FFT; the length must be a power of two. */
export declare function fft(re: Float32Array | Float64Array, im: Float32Array | Float64Array): void;
/** Spectral centroid (the "brightness" of the sound), in Hz. */
export declare function centroid(mono: Float32Array, sampleRate: number): number;
export declare function analyze(channels: Float32Array[], sampleRate: number, slices?: number): Stats;
/** Things that usually mean the sound needs another pass. */
export declare function warnings(stats: Stats): string[];
/** One line per measurement, readable in a terminal: this is how the command line "listens". */
export declare function describe(stats: Stats): string[];

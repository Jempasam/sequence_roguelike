import { type Format } from "./encode.js";
import type { Engine, RenderOptions } from "./engine.js";
/** One source file to render and where to write it. */
export interface Job {
    src: string;
    /** Output file. Without it, the sound is written beside its source. */
    out?: string;
    format: Format;
    bitrate: number;
    options: RenderOptions;
}
/** Options shared by every job of a command; a manifest entry can override each of them. */
export interface JobDefaults {
    format?: Format;
    bitrate?: number;
    options?: RenderOptions;
}
export interface JobResult {
    job: Job;
    ok: boolean;
    /** The status line, or the error. */
    message: string;
    /** Quality warnings (clipping, cut tail, ...). */
    warnings: string[];
    out?: string;
}
/** `sounds/coin.faust.dsp` → `coin`. */
export declare const soundName: (file: string) => string;
/** Expand `*` and `?` in the file name part (Windows shells leave them alone). */
export declare function expandGlob(pattern: string): string[];
/** Pair sources with targets: one `-o` per source, or a single directory. */
export declare function planJobs(sources: string[], outs: string[], defaults?: JobDefaults): Job[];
/** Read a manifest: `[{"src": "a.faust.dsp", "out": "out/a.mp3", "duration": 0.5, "params": {"pitch": 440}, "format": "wav"}, ...]`. */
export declare function readManifest(file: string, defaults?: JobDefaults): Job[];
export declare function outputPath(job: Job): string;
export interface RunOptions {
    failFast?: boolean;
    /** Called after each job, so the command line prints as it goes. */
    onResult?: (result: JobResult) => void;
}
/** Render every job with the same engine. A failing job is reported and does not stop the others. */
export declare function runJobs(engine: Engine, jobs: Job[], run?: RunOptions): Promise<JobResult[]>;

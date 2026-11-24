import { FaustCompiler, FaustMonoDspGenerator } from "@grame/faustwasm/dist/esm/index.js";
import type { FaustModule } from "@grame/faustwasm/dist/esm/index.js";
import { type Stats } from "./analyze.js";
/**
 * The Faust compiler (WebAssembly) wrapped for sound effects. It is environment-agnostic: the
 * caller hands it an instantiated Faust module, from Node (`node.ts`) or from the browser
 * (the editor), so the command line and the editor run exactly the same code.
 *
 * A sound is a Faust program with one input, `t`, a ramp that goes from 0 on the first sample to 1
 * on the last, and a `declare duration "<seconds>";`.
 */
export interface ParamInfo {
    /** Short name, as written in the Faust source: `hslider("freq", ...)` → `freq`. */
    name: string;
    address: string;
    type: string;
    init: number;
    min: number;
    max: number;
    step: number;
}
/** A source with the files it imports from its own folder: their text, by the name the source gives them. */
export interface Sound {
    source: string;
    libs: Record<string, string>;
}
export interface Compiled {
    name: string;
    /** Seconds, from `declare duration`. */
    duration: number | undefined;
    description: string | undefined;
    meta: Record<string, string>;
    params: ParamInfo[];
    inputs: number;
    outputs: number;
    generator: FaustMonoDspGenerator;
}
export interface RenderOptions {
    /** Overrides `declare duration`. */
    duration?: number;
    sampleRate?: number;
    /** Values for the sliders, by short name. */
    params?: Record<string, number>;
    /** Fade the first and last milliseconds so the file never clicks. Default true. */
    fade?: boolean;
    /** Scale the peak to this level in dBFS. */
    normalize?: number;
}
export interface Rendered {
    name: string;
    channels: Float32Array[];
    sampleRate: number;
    duration: number;
    params: Record<string, number>;
    stats: Stats;
}
export declare const DEFAULT_SAMPLE_RATE = 44100;
export declare const MAX_DURATION = 60;
/**
 * The Faust runtime prints "Aborted(Assertion failed: Exception thrown ...)" each time a program has
 * an error, although the compiler carries on and the error is reported properly. The runtime keeps
 * the `console.error` it finds when it starts, so call this BEFORE instantiating the Faust module.
 */
export declare function silenceFaustAbortNotice(): void;
export declare function hash(text: string): string;
export declare class Engine {
    readonly compiler: FaustCompiler;
    private readonly cache;
    /**
     * @param module an instantiated Faust module
     * @param libs the sound-effect library: file name → Faust source (`sfx.lib`, `sfx_env.lib`, ...)
     */
    constructor(module: FaustModule, libs?: Record<string, string>);
    get version(): string;
    /** (Re)write the library files the sources can `import`. */
    setLibraries(libs: Record<string, string>): void;
    /** Compile a source. Throws an `Error` carrying the Faust message, with its line number. */
    compile(sound: string | Sound, name?: string): Promise<Compiled>;
    /** Compile and render. */
    render(sound: string | Sound, options?: RenderOptions): Promise<Rendered>;
}

import { Engine, type Sound } from "./engine.js";
/** The project root, whether this runs from `src/` or from `dist/`. */
export declare const ROOT: string;
export declare const LIB_DIR: string;
export declare const EXAMPLES_DIR: string;
/** Every `*.lib` of the project's `lib/` folder, by file name. */
export declare function readLibraries(dir?: string): Record<string, string>;
/**
 * The source of a file with the files it imports from its own folder, as Faust finds them: a path
 * relative to the file that writes the import, tried before the library folder. Those files can import
 * others the same way. Any other import (`sfx.lib`, `stdfaust.lib`) is left to the engine.
 */
export declare function readSound(file: string): Sound;
/**
 * One Faust engine per process. Loading the WebAssembly compiler takes a fraction of a second, so
 * the command line renders every job of a batch with the same engine.
 */
export declare function nodeEngine(): Promise<Engine>;

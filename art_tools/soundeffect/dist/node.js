import { instantiateFaustModuleFromFile } from "@grame/faustwasm/dist/esm/index.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Engine, hash, silenceFaustAbortNotice } from "./engine.js";
/** The project root, whether this runs from `src/` or from `dist/`. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LIB_DIR = path.join(ROOT, "lib");
export const EXAMPLES_DIR = path.join(ROOT, "examples");
/** Every `*.lib` of the project's `lib/` folder, by file name. */
export function readLibraries(dir = LIB_DIR) {
    const libs = {};
    for (const file of readdirSync(dir)) {
        if (file.endsWith(".lib"))
            libs[file] = readFileSync(path.join(dir, file), "utf8");
    }
    return libs;
}
/** `import("x")` and `library("x")`, as Faust reads them. */
const IMPORT = /\b(import|library)\s*\(\s*"([^"]+)"\s*\)/g;
/**
 * The source of a file with the files it imports from its own folder, as Faust finds them: a path
 * relative to the file that writes the import, tried before the library folder. Those files can import
 * others the same way. Any other import (`sfx.lib`, `stdfaust.lib`) is left to the engine.
 */
export function readSound(file) {
    const libs = {};
    const source = bringLocal(path.resolve(file), libs);
    return { source, libs };
}
function bringLocal(file, libs) {
    return readFileSync(file, "utf8").replace(IMPORT, (whole, keyword, name) => {
        const target = path.resolve(path.dirname(file), name);
        if (!existsSync(target))
            return whole;
        const key = `local_${hash(target)}_${path.basename(target)}`;
        if (!(key in libs)) {
            libs[key] = "";
            libs[key] = bringLocal(target, libs);
        }
        return `${keyword}("${key}")`;
    });
}
let shared;
/**
 * One Faust engine per process. Loading the WebAssembly compiler takes a fraction of a second, so
 * the command line renders every job of a batch with the same engine.
 */
export function nodeEngine() {
    shared ??= (async () => {
        silenceFaustAbortNotice();
        const entry = fileURLToPath(import.meta.resolve("@grame/faustwasm/package.json"));
        const faustModule = await instantiateFaustModuleFromFile(path.join(path.dirname(entry), "libfaust-wasm", "libfaust-wasm.js"));
        return new Engine(faustModule, readLibraries());
    })();
    return shared;
}

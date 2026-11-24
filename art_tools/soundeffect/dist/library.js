import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { EXAMPLES_DIR, LIB_DIR } from "./node.js";
const declared = (source, key) => new RegExp(`^\\s*declare\\s+${key}\\s+"([^"]*)"`, "m").exec(source)?.[1] ?? "";
/**
 * What each library file offers. A function is documented by a comment line right above it:
 * `// @ ad(attack, t) -- attack / decay envelope`.
 */
export function describeLibraries(dir = LIB_DIR) {
    return readdirSync(dir).filter(file => file.endsWith(".lib")).sort().map(file => {
        const source = readFileSync(path.join(dir, file), "utf8");
        const entries = [];
        for (const line of source.split(/\r?\n/)) {
            const match = /^\/\/\s*@\s*(.+?)\s*(?:--\s*(.*))?$/.exec(line);
            if (match)
                entries.push({ signature: match[1], doc: match[2] ?? "" });
        }
        return { file, description: declared(source, "description"), entries };
    }).filter(lib => lib.entries.length > 0); // sfx.lib only gathers the others
}
export function describeExamples(dir = EXAMPLES_DIR) {
    return readdirSync(dir).filter(file => file.endsWith(".faust.dsp")).sort().map(file => {
        const source = readFileSync(path.join(dir, file), "utf8");
        return {
            name: file.replace(/\.faust\.dsp$/, ""),
            file: path.join(dir, file),
            description: declared(source, "description"),
            duration: declared(source, "duration"),
        };
    });
}

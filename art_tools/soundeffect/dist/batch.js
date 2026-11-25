import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { warnings } from "./analyze.js";
import { DEFAULT_BITRATE, DEFAULT_FORMAT, encodeAudio, FORMATS } from "./encode.js";
import { readSound } from "./node.js";
const SOURCE_SUFFIX = /\.faust\.dsp$|\.dsp$/i;
/** `sounds/coin.faust.dsp` → `coin`. */
export const soundName = (file) => path.basename(file).replace(SOURCE_SUFFIX, "");
/** Expand `*` and `?` in the file name part (Windows shells leave them alone). */
export function expandGlob(pattern) {
    if (!/[*?]/.test(path.basename(pattern)))
        return [pattern];
    const dir = path.dirname(pattern);
    const regex = new RegExp("^" + path.basename(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
    if (!existsSync(dir))
        return [];
    return readdirSync(dir).filter(name => regex.test(name)).sort().map(name => path.join(dir, name));
}
const isDirectoryTarget = (target) => /[\\/]$/.test(target) || (existsSync(target) && statSync(target).isDirectory());
/** Pair sources with targets: one `-o` per source, or a single directory. */
export function planJobs(sources, outs, defaults = {}) {
    const files = sources.flatMap(expandGlob);
    if (files.length === 0)
        throw new Error("no source file");
    const format = defaults.format ?? DEFAULT_FORMAT;
    const make = (src, out) => ({
        src,
        out,
        format: extensionFormat(out) ?? format,
        bitrate: defaults.bitrate ?? DEFAULT_BITRATE,
        options: { ...defaults.options },
    });
    if (outs.length === 0)
        return files.map(src => make(src, undefined));
    if (outs.length === 1 && (files.length > 1 || isDirectoryTarget(outs[0]))) {
        if (!isDirectoryTarget(outs[0]))
            throw new Error(`${files.length} sources but one output file: end the output with / to name a folder, or give one -o per source`);
        return files.map(src => make(src, path.join(outs[0], `${soundName(src)}.${format}`)));
    }
    if (outs.length !== files.length)
        throw new Error(`${files.length} source(s) but ${outs.length} -o: give one -o per source, or a single folder`);
    return files.map((src, i) => make(src, outs[i]));
}
function extensionFormat(file) {
    const ext = file ? path.extname(file).slice(1).toLowerCase() : "";
    return FORMATS.includes(ext) ? ext : undefined;
}
/** Read a manifest: `[{"src": "a.faust.dsp", "out": "out/a.mp3", "duration": 0.5, "params": {"pitch": 440}, "format": "wav"}, ...]`. */
export function readManifest(file, defaults = {}) {
    const base = path.dirname(path.resolve(file));
    let entries;
    try {
        entries = JSON.parse(readFileSync(file, "utf8"));
    }
    catch (cause) {
        throw new Error(`cannot read ${file}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    if (!Array.isArray(entries))
        throw new Error(`${file}: expected a list of {"src", "out", ...}`);
    return entries.map((entry, index) => {
        if (typeof entry?.src !== "string")
            throw new Error(`${file}: entry ${index} has no "src"`);
        const out = typeof entry.out === "string" ? path.resolve(base, entry.out) : undefined;
        const format = (entry.format ?? extensionFormat(out) ?? defaults.format ?? DEFAULT_FORMAT);
        if (!FORMATS.includes(format))
            throw new Error(`${file}: entry ${index}: unknown format "${format}"`);
        return {
            src: path.resolve(base, entry.src),
            out,
            format,
            bitrate: Number(entry.bitrate ?? defaults.bitrate ?? DEFAULT_BITRATE),
            options: {
                ...defaults.options,
                ...(entry.duration !== undefined ? { duration: Number(entry.duration) } : {}),
                ...(entry.rate !== undefined ? { sampleRate: Number(entry.rate) } : {}),
                ...(entry.normalize !== undefined ? { normalize: Number(entry.normalize) } : {}),
                ...(entry.fade !== undefined ? { fade: Boolean(entry.fade) } : {}),
                params: { ...defaults.options?.params, ...entry.params },
            },
        };
    });
}
export function outputPath(job) {
    return job.out ?? path.join(path.dirname(job.src), `${soundName(job.src)}.${job.format}`);
}
/** Render one job with the engine and write its file. A failure is a result, never an exception. */
export async function runJob(engine, job) {
    try {
        const rendered = await engine.render(readSound(job.src), job.options);
        const bytes = await encodeAudio(rendered, job.format, job.bitrate);
        const out = outputPath(job);
        mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
        writeFileSync(out, bytes);
        const { stats } = rendered;
        return {
            job,
            ok: true,
            out,
            warnings: warnings(stats),
            message: `${out} — ${stats.duration.toFixed(3)} s ${stats.channels === 1 ? "mono" : "stereo"}, peak ${stats.peakDb.toFixed(1)} dBFS, rms ${stats.rmsDb.toFixed(1)} dBFS, ${(bytes.length / 1024).toFixed(1)} KB`,
        };
    }
    catch (cause) {
        return { job, ok: false, warnings: [], message: `${job.src}: ${cause instanceof Error ? cause.message : String(cause)}` };
    }
}
/** Render every job with the same engine. A failing job is reported and does not stop the others. */
export async function runJobs(engine, jobs, run = {}) {
    const results = [];
    for (const job of jobs) {
        const result = await runJob(engine, job);
        results.push(result);
        run.onResult?.(result);
        if (!result.ok && run.failFast)
            break;
    }
    return results;
}

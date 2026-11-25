#!/usr/bin/env node
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {analyze, describe, warnings} from "../dist/analyze.js"
import {expandGlob, outputPath, planJobs, readManifest, runJobs, soundName} from "../dist/batch.js"
import {runJobsInWorkers} from "../dist/parallel.js"
import {DEFAULT_BITRATE, DEFAULT_FORMAT, encodeAudio, FORMATS} from "../dist/encode.js"
import {describeExamples, describeLibraries} from "../dist/library.js"
import {nodeEngine, readSound, EXAMPLES_DIR, LIB_DIR} from "../dist/node.js"
import {MANIFEST_SCHEMA} from "../dist/schema.js"
import {mulberry32, randomParams} from "../dist/variants.js"
import {decodeOgg} from "../dist/ogg.js"
import {decodeWav} from "../dist/wav.js"

const HELP = `sfx — sound effects written as Faust code, rendered from the command line.

A sound is a <name>.faust.dsp file: a Faust program with  declare duration "0.5";  and one input,
t, a ramp from 0 to 1 over the whole sound.  process(t) = ...

  sfx render  <a.faust.dsp> [b.faust.dsp ...] [-o out]   render to MP3 (or WAV, OGG)
  sfx render  --batch jobs.json                          render a list of {src, out, ...}
  sfx variants <a.faust.dsp> [...] -o dir/ [-n 5]        N random variants (sliders drawn in their bounds)
  sfx inspect <a.faust.dsp|a.wav|a.ogg> [...]                measure: peak, rms, tail, brightness, envelope
  sfx check   <a.faust.dsp> [...]                        compile only, print Faust errors
  sfx list    [lib|examples|params <a.faust.dsp>]        what the library and the examples offer
  sfx schema                                             JSON Schema of the --batch manifest
  sfx play    <a.faust.dsp|a.wav|a.mp3|a.ogg>            listen (Windows)
  sfx doctor                                             check the installation

Several sources in one command load the Faust compiler once. Give one -o per source, or one folder
ending with / :  sfx render a.faust.dsp b.faust.dsp -o out/

Options
  -o, --out <file|dir/>    output (repeatable, one per source, or a single folder)
  -d, --duration <s>       override  declare duration
  -r, --rate <Hz>          sample rate (default 44100)
  -p, --param name=value   set a slider (repeatable), or inline JSON {"name": value}
  -f, --format mp3|wav|ogg output format (default ${DEFAULT_FORMAT}; the extension of -o also works). Use wav or ogg to loop.
  -b, --bitrate <kbps>     MP3 bitrate, or the matching Ogg Vorbis quality (default ${DEFAULT_BITRATE})
      --normalize <dBFS>   scale the peak to this level, for example -1
      --no-fade            keep the first and last milliseconds as they are
  -n, --count <n>          variants: how many (default 5)
      --seed <n>           variants: random seed (default 1)
      --fail-fast          stop a batch at the first failure
  -j, --jobs <n>           render, batch: how many sounds are rendered at once, each on a thread with its own
                           Faust engine (default 1). The files are the same, only the order of the lines varies.
`

const VALUED = {
    o: "out", out: "out", d: "duration", duration: "duration", r: "rate", rate: "rate", p: "param", param: "param",
    f: "format", format: "format", b: "bitrate", bitrate: "bitrate", normalize: "normalize",
    n: "count", count: "count", seed: "seed", batch: "batch", j: "jobs", jobs: "jobs",
}
const BOOLEAN = {"no-fade": "noFade", "fail-fast": "failFast", help: "help", h: "help", json: "json"}
const REPEATABLE = new Set(["out", "param"])

function fail(message){
    console.error(message)
    process.exit(1)
}

function parseArgs(argv){
    const positional = []
    const flags = {out: [], param: []}
    for(let i = 0; i < argv.length; i++){
        const arg = argv[i]
        if(!arg.startsWith("-") || arg === "-"){
            positional.push(arg)
            continue
        }
        const [rawName, inline] = arg.replace(/^--?/, "").split(/=(.*)/s)
        if(rawName in BOOLEAN){
            flags[BOOLEAN[rawName]] = true
            continue
        }
        const name = VALUED[rawName]
        if(!name) fail(`unknown option ${arg} (sfx --help)`)
        const value = inline !== undefined ? inline : argv[++i]
        if(value === undefined) fail(`${arg} needs a value`)
        if(REPEATABLE.has(name)) flags[name].push(value)
        else flags[name] = value
    }
    return {positional, flags}
}

const number = (flags, name) => {
    if(flags[name] === undefined) return undefined
    const value = Number(flags[name])
    if(!Number.isFinite(value)) fail(`--${name} must be a number, got "${flags[name]}"`)
    return value
}

/** `-p freq=440 -p '{"gain": 0.5}'` → {freq: 440, gain: 0.5} */
function parseParams(list){
    const params = {}
    for(const item of list){
        if(item.trim().startsWith("{")){
            let parsed
            try{ parsed = JSON.parse(item) }
            catch(cause){ fail(`-p: invalid JSON (${cause.message})`) }
            for(const [key, value] of Object.entries(parsed)) params[key] = Number(value)
            continue
        }
        const at = item.indexOf("=")
        if(at < 1) fail(`-p expects name=value, got "${item}"`)
        const value = Number(item.slice(at + 1))
        if(!Number.isFinite(value)) fail(`-p ${item}: the value must be a number`)
        params[item.slice(0, at).trim()] = value
    }
    return params
}

function defaultsFrom(flags){
    if(flags.format !== undefined && !FORMATS.includes(flags.format)) fail(`--format must be ${FORMATS.join(" or ")}, got "${flags.format}"`)
    const options = {params: parseParams(flags.param)}
    const duration = number(flags, "duration")
    const rate = number(flags, "rate")
    const normalize = number(flags, "normalize")
    if(duration !== undefined) options.duration = duration
    if(rate !== undefined) options.sampleRate = rate
    if(normalize !== undefined) options.normalize = normalize
    if(flags.noFade) options.fade = false
    return {format: flags.format, bitrate: number(flags, "bitrate"), options}
}

function report(result){
    if(result.ok){
        console.log(`ok    ${result.message}`)
        for(const warning of result.warnings) console.log(`      ! ${warning}`)
    }
    else console.error(`FAIL  ${result.message}`)
}

function summary(results){
    const failed = results.filter(r => !r.ok).length
    if(results.length > 1) console.log(`${results.length - failed}/${results.length} rendered${failed ? `, ${failed} failed` : ""}`)
    return failed
}

async function renderCommand({positional, flags}){
    const defaults = defaultsFrom(flags)
    let jobs
    try{
        jobs = flags.batch !== undefined
            ? readManifest(flags.batch, defaults)
            : planJobs(positional, flags.out, defaults)
    }
    catch(error){
        fail(error.message)
    }
    const workers = number(flags, "jobs") ?? 1
    if(!Number.isInteger(workers) || workers < 1) fail(`--jobs must be a whole number of 1 or more, got "${flags.jobs}"`)
    const results = workers > 1 && jobs.length > 1
        ? await runJobsInWorkers(jobs, {workers, failFast: flags.failFast, onResult: report})
        : await runJobs(await nodeEngine(), jobs, {failFast: flags.failFast, onResult: report})
    process.exit(summary(results) ? 1 : 0)
}

async function variantsCommand({positional, flags}){
    const files = positional.flatMap(expandGlob)
    if(files.length === 0) fail("variants: give at least one .faust.dsp")
    if(flags.out.length !== 1) fail("variants: give one folder with -o dir/")
    const defaults = defaultsFrom(flags)
    const format = defaults.format ?? DEFAULT_FORMAT
    const count = number(flags, "count") ?? 5
    const seed = number(flags, "seed") ?? 1
    const engine = await nodeEngine()
    let failed = 0
    for(const file of files){
        try{
            const source = readSound(file)
            const compiled = await engine.compile(source)
            const sliders = compiled.params.filter(p => p.type !== "button")
            if(sliders.length === 0) throw new Error("no sliders in this sound: there is nothing to vary (add hslider(...) parameters)")
            for(let i = 1; i <= count; i++){
                const random = mulberry32(seed * 7919 + i)
                const params = randomParams(sliders, random, defaults.options.params)
                const rendered = await engine.render(source, {...defaults.options, params})
                const out = path.join(flags.out[0], `${soundName(file)}_${i}.${format}`)
                mkdirSync(path.dirname(path.resolve(out)), {recursive: true})
                writeFileSync(out, await encodeAudio(rendered, format, defaults.bitrate))
                const shown = Object.entries(params).map(([k, v]) => `${k}=${+v.toFixed(3)}`).join(" ")
                console.log(`ok    ${out} — peak ${rendered.stats.peakDb.toFixed(1)} dBFS  ${shown}`)
                for(const warning of warnings(rendered.stats)) console.log(`      ! ${warning}`)
            }
        }
        catch(error){
            failed++
            console.error(`FAIL  ${file}: ${error.message}`)
        }
    }
    process.exit(failed ? 1 : 0)
}

async function inspectCommand({positional, flags}){
    const files = positional.flatMap(expandGlob)
    if(files.length === 0) fail("inspect: give a .faust.dsp, a .wav or an .ogg")
    const defaults = defaultsFrom(flags)
    let failed = 0
    for(const file of files){
        try{
            let stats
            if(/\.wav$/i.test(file)){
                const wav = decodeWav(new Uint8Array(readFileSync(file)))
                stats = analyze(wav.channels, wav.sampleRate)
            }
            else if(/\.ogg$/i.test(file)){
                const ogg = await decodeOgg(new Uint8Array(readFileSync(file)))
                stats = analyze(ogg.channels, ogg.sampleRate)
            }
            else if(/\.mp3$/i.test(file)){
                throw new Error("cannot read an MP3 back: inspect the .faust.dsp, or render a .wav")
            }
            else{
                const engine = await nodeEngine()
                stats = (await engine.render(readSound(file), defaults.options)).stats
            }
            console.log(`${file}`)
            for(const line of describe(stats)) console.log(`  ${line}`)
            const issues = warnings(stats)
            if(issues.length === 0) console.log("  ok: no warning")
            for(const issue of issues) console.log(`  ! ${issue}`)
        }
        catch(error){
            failed++
            console.error(`FAIL  ${file}: ${error.message}`)
        }
    }
    process.exit(failed ? 1 : 0)
}

async function checkCommand({positional}){
    const files = positional.flatMap(expandGlob)
    if(files.length === 0) fail("check: give a .faust.dsp")
    const engine = await nodeEngine()
    let failed = 0
    for(const file of files){
        try{
            const compiled = await engine.compile(readSound(file))
            const problems = []
            if(compiled.duration === undefined) problems.push('missing  declare duration "...";')
            if(compiled.inputs > 1) problems.push(`process takes ${compiled.inputs} inputs, expected 1 (t)`)
            if(compiled.outputs < 1 || compiled.outputs > 2) problems.push(`process has ${compiled.outputs} outputs, expected 1 or 2`)
            if(problems.length) throw new Error(problems.join("; "))
            const params = compiled.params.map(p => p.type === "button" ? p.name : `${p.name}=${p.init} [${p.min}..${p.max}]`).join(", ")
            console.log(`ok    ${file} — ${compiled.duration} s, ${compiled.outputs === 1 ? "mono" : "stereo"}${params ? `, params: ${params}` : ""}`)
        }
        catch(error){
            failed++
            console.error(`FAIL  ${file}: ${error.message}`)
        }
    }
    process.exit(failed ? 1 : 0)
}

async function listCommand({positional}){
    const [what, file] = positional
    if(what === "params"){
        if(!file) fail("list params: give a .faust.dsp")
        const compiled = await (await nodeEngine()).compile(readSound(file))
        for(const p of compiled.params) console.log(`${p.name}  ${p.type}  init ${p.init}  range ${p.min}..${p.max}  step ${p.step}`)
        if(compiled.params.length === 0) console.log("(no sliders)")
        return
    }
    if(what !== undefined && what !== "lib" && what !== "examples") fail(`list: unknown "${what}" (lib, examples, params <file>)`)
    if(what !== "examples"){
        console.log(`Library — import("sfx.lib"), then  sfx.<module>.<function>   (sources in ${LIB_DIR})`)
        for(const lib of describeLibraries()){
            console.log(`\n${lib.file}${lib.description ? ` — ${lib.description}` : ""}`)
            for(const entry of lib.entries) console.log(`  ${entry.signature}${entry.doc ? `   ${entry.doc}` : ""}`)
        }
    }
    if(what !== "lib"){
        console.log(`\nExamples (${EXAMPLES_DIR})`)
        for(const example of describeExamples()) console.log(`  ${example.name.padEnd(14)} ${(example.duration + " s").padEnd(8)} ${example.description}`)
    }
}

async function playCommand({positional, flags}){
    const [file] = positional
    if(!file) fail("play: give a file")
    let target = file
    if(!/\.(wav|mp3|ogg)$/i.test(file)){
        const engine = await nodeEngine()
        const rendered = await engine.render(readSound(file), defaultsFrom(flags).options)
        target = path.join(mkdtempSync(path.join(tmpdir(), "sfx-")), "play.wav")
        writeFileSync(target, await encodeAudio(rendered, "wav"))
    }
    else if(/\.ogg$/i.test(file)){
        const ogg = await decodeOgg(new Uint8Array(readFileSync(file)))
        target = path.join(mkdtempSync(path.join(tmpdir(), "sfx-")), "play.wav")
        writeFileSync(target, await encodeAudio(ogg, "wav"))
    }
    const full = path.resolve(target).replace(/'/g, "''")
    const script = /\.mp3$/i.test(target)
        ? `Start-Process -FilePath '${full}'`
        : `(New-Object System.Media.SoundPlayer '${full}').PlaySync()`
    const run = spawnSync("powershell", ["-NoProfile", "-Command", script], {stdio: "inherit"})
    if(run.status) fail("play: this needs Windows PowerShell")
}

async function doctorCommand(){
    console.log(`node       ${process.version}`)
    const engine = await nodeEngine()
    console.log(`faust      ${engine.version} (WebAssembly, no install needed)`)
    const libs = describeLibraries()
    console.log(`library    ${libs.length} files, ${libs.reduce((n, l) => n + l.entries.length, 0)} documented functions`)
    console.log(`examples   ${describeExamples().length}`)
    const rendered = await engine.render('declare duration "0.1";\nprocess(t) = os.osc(440) * (1-t);\nimport("stdfaust.lib");')
    console.log(`self-test  ok (${rendered.stats.frames} samples, peak ${rendered.stats.peakDb.toFixed(1)} dBFS)`)
}

const COMMANDS = {
    render: renderCommand, variants: variantsCommand, inspect: inspectCommand, check: checkCommand,
    list: listCommand, play: playCommand, doctor: doctorCommand,
    schema: async ({flags}) => {
        const text = JSON.stringify(MANIFEST_SCHEMA, null, 2)
        if(flags.out.length) writeFileSync(flags.out[0], text + "\n")
        else console.log(text)
    },
}

const [command, ...rest] = process.argv.slice(2)
if(!command || command === "help" || command === "--help" || command === "-h"){
    console.log(HELP)
    process.exit(command ? 0 : 1)
}
if(!(command in COMMANDS)) fail(`unknown command "${command}" (sfx --help)`)
const parsed = parseArgs(rest)
if(parsed.flags.help){
    console.log(HELP)
    process.exit(0)
}
try{
    await COMMANDS[command](parsed)
}
catch(error){
    fail(error instanceof Error ? error.message : String(error))
}

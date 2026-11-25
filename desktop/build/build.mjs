// Builds the desktop release for the current OS and architecture, in dist/<platform>-<arch>/:
//   roguelike(.exe)  Node SEA: a copy of this node binary with the bundled game injected
//   native/          the .node addons and the libraries they load (SDL2, ANGLE)
//   assets/          a copy of the repo's assets/ and generated_assets/, merged
// With --no-sea, the bundle stays there as main.cjs instead of the executable, to run with
// `node main.cjs`. Same bundle, same layout, so it tells a bundling problem from a SEA one.
// On Windows the executable is a GUI one (no console window); --console keeps node's console subsystem,
// to see the logs and errors (npm run desktop:build:debug).
// Cross-building is not supported: SEA injects into the running node binary, and the addons are the
// prebuilt ones npm installed for this machine.

import { execFileSync } from "node:child_process"
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { inject } from "postject"
import { build } from "vite"

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const REPO = resolve(DESKTOP, "..")
const OUT = join(DESKTOP, "dist", `${process.platform}-${process.arch}`)
const MAIN = join(OUT, "main.cjs")
const BLOB_DIRECTORY = join(DESKTOP, "dist", "sea")
const EXE = join(OUT, process.platform === "win32" ? "roguelike.exe" : "roguelike")
const SEA = !process.argv.includes("--no-sea")
const CONSOLE = process.argv.includes("--console")
const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

// Writes main.cjs and native/ into OUT, see vite.config.ts.
await build({ root: DESKTOP, logLevel: "warn" })
// audioWorker.cjs, next to it: a worker starts from a file, so the executable does not carry it.
execFileSync(process.execPath, [join(DESKTOP, "build", "audioWorker.mjs")], { stdio: "inherit" })
// generated_assets/ is not committed: it holds what npm run art makes, and is shipped as if it was in assets/.
for(const folder of ["assets", "generated_assets"]){
    if(existsSync(join(REPO, folder))) cpSync(join(REPO, folder), join(OUT, "assets"), { recursive: true })
}
if(SEA) await seaInject()
console.log(`Built ${relative(REPO, SEA ? EXE : MAIN)}`)


//// SEA ////

async function seaInject(){
    rmSync(BLOB_DIRECTORY, { recursive: true, force: true })
    mkdirSync(BLOB_DIRECTORY, { recursive: true })
    const config = join(BLOB_DIRECTORY, "sea-config.json")
    const blob = join(BLOB_DIRECTORY, "sea-prep.blob")
    writeFileSync(config, JSON.stringify({ main: MAIN, output: blob, disableExperimentalSEAWarning: true }))
    execFileSync(process.execPath, ["--experimental-sea-config", config], { stdio: "inherit" })
    copyFileSync(process.execPath, EXE)
    // macOS refuses to run a binary whose signature no longer matches, so it is removed before the
    // injection and replaced by an ad hoc one after. Windows only warns about the broken signature.
    if(process.platform === "darwin") execFileSync("codesign", ["--remove-signature", EXE])
    await inject(EXE, "NODE_SEA_BLOB", readFileSync(blob), {
        sentinelFuse: SEA_FUSE,
        machoSegmentName: process.platform === "darwin" ? "NODE_SEA" : undefined,
    })
    if(process.platform === "darwin") execFileSync("codesign", ["--sign", "-", EXE])
    if(process.platform === "win32" && !CONSOLE) setWindowsGuiSubsystem(EXE)
    // The executable carries the bundle, so the release folder does not ship it twice.
    rmSync(MAIN)
}

// node.exe is a console program (PE subsystem 3): Windows opens a console for it. Subsystem 2 is the GUI one.
function setWindowsGuiSubsystem(path){
    const bytes = readFileSync(path)
    const subsystem = bytes.readUInt32LE(0x3C) + 0x5C // e_lfanew, then the Subsystem field of the optional header
    bytes.writeUInt16LE(2, subsystem)
    writeFileSync(path, bytes)
}

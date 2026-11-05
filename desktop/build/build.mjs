// Builds the desktop release for the current OS and architecture, in dist/<platform>-<arch>/:
//   roguelike(.exe)  Node SEA: a copy of this node binary with the bundled game injected
//   native/          the .node addons and the libraries they load (SDL2, ANGLE)
//   assets/          a copy of the repo's assets/
// With --no-sea, the bundle stays there as main.cjs instead of the executable, to run with
// `node main.cjs`. Same bundle, same layout, so it tells a bundling problem from a SEA one.
// Cross-building is not supported: SEA injects into the running node binary, and the addons are the
// prebuilt ones npm installed for this machine.

import { execFileSync } from "node:child_process"
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
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
const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

// Writes main.cjs and native/ into OUT, see vite.config.ts.
await build({ root: DESKTOP, logLevel: "warn" })
cpSync(join(REPO, "assets"), join(OUT, "assets"), { recursive: true })
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
    // The executable carries the bundle, so the release folder does not ship it twice.
    rmSync(MAIN)
}

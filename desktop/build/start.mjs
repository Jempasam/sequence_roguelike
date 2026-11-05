// Runs the release built by build.mjs for this machine: the executable, or with --node the bundle
// built by --no-sea, run by this node.

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(DESKTOP, "dist", `${process.platform}-${process.arch}`)
const NODE = process.argv.includes("--node")
const NAME = process.platform === "win32" ? "roguelike.exe" : "roguelike"
const TARGET = join(OUT, NODE ? "main.cjs" : NAME)
const BUILD = NODE ? "npm run desktop:build:node" : "npm run desktop:build"

if(!existsSync(TARGET)) throw new Error(`${TARGET} does not exist. Run ${BUILD} first.`)
const { status } = NODE
    ? spawnSync(process.execPath, [TARGET], { stdio: "inherit" })
    : spawnSync(TARGET, { stdio: "inherit" })
process.exit(status ?? 1)

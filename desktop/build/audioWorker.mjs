// Builds the audio worker, audioWorker.cjs, into the release folder. It is a program of its own, run apart
// by dev.mjs: a Vite build sets NODE_ENV to production for the whole process, and the game started after
// it in the same one would take itself for a release.

import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "vite"

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..")

await build({ root: DESKTOP, mode: "audioWorker", logLevel: "warn" })

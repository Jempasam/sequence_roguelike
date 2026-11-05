// Runs src/main.ts through Vite's module runner, and restarts it when a source file changes.

import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, createServerModuleRunner } from "vite"

const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCES = resolve(SERVER, "src") + sep
const ENTRY = "/src/main.ts"

const vite = await createServer({
    root: SERVER,
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
})
const runner = createServerModuleRunner(vite.environments.ssr, { hmr: false })

let running = await runner.import(ENTRY)
// Chained, so a burst of saves restarts once after another and two servers never fight for the port.
let restarting = Promise.resolve()

vite.watcher.on("change", file => {
    if(!resolve(file).startsWith(SOURCES)) return
    restarting = restarting.then(() => restart(file))
})

async function restart(file){
    console.log(`${relative(SERVER, file)} changed, restarting`)
    try {
        await running?.stop()
        running = null
        runner.clearCache()
        running = await runner.import(ENTRY)
    } catch(error){
        // Kept alive: the next save retries, as tsx watch would.
        console.error("Restart failed, waiting for the next change:", error)
    }
}

// Runs src/main.ts through Vite's module runner, so the desktop sources get the same import syntax as
// the web ones (?raw, ?url, import.meta.glob, import.meta.env) without a build.

import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, createServerModuleRunner } from "vite"

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const server = await createServer({
    root: DESKTOP,
    appType: "custom",
    // No file watcher and no HMR socket: nothing is reloaded.
    server: { middlewareMode: true, hmr: false, watch: null },
})
const runner = createServerModuleRunner(server.environments.ssr, { hmr: false })
const { closed } = await runner.import("/src/main.ts")
// The server stays up while the game runs, for the imports it resolves lazily, and keeps the process
// alive until it is closed.
await closed
await runner.close()
await server.close()

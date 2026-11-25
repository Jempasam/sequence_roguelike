// Runs src/main.ts through Vite's module runner, so the desktop sources get the same import syntax as
// the web ones (?raw, ?url, import.meta.glob, import.meta.env) without a build.

import { execFileSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, createServerModuleRunner } from "vite"

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..")

// The audio worker starts from a file, which the module runner does not make: it is built first, by a
// process of its own, since a Vite build leaves NODE_ENV on production and the game would run as a release.
execFileSync(process.execPath, [join(DESKTOP, "build", "audioWorker.mjs")], { stdio: "inherit" })

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

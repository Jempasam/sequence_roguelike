import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

// With its extension: Vite's native config loader, its next default, does not resolve bare paths.
import { cWasm } from "../core/build/cWasm.ts"

export default defineConfig({
    plugins: [cWasm()],
    test: { testTimeout: 30_000 },
    resolve: {
        alias: { "@game/core-src": fileURLToPath(new URL("../core/src", import.meta.url)) },
    },
})

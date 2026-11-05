import { defineConfig } from "vite"

// With its extension: Vite's native config loader, its next default, does not resolve bare paths.
import { cWasm } from "../core/build/cWasm.ts"

export default defineConfig({
    plugins: [cWasm()],
})

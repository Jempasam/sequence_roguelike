import { defineConfig } from "vite"

// With its extension: Vite's native config loader, its next default, does not resolve bare paths.
import { cWasm } from "../core/build/cWasm.ts"

export default defineConfig({
    // Relative, so the build runs from any sub-path it is uploaded to.
    base: "./",
    // Served as is, without hashed names: the asset adapter adds ?v=BUILD_ID itself.
    publicDir: "../assets",
    define: {
        BUILD_ID: JSON.stringify(Date.now().toString(36)),
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    plugins: [cWasm()],
})

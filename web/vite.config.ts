import { resolve } from "node:path"
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
        // WEB_OUT_DIR: target folder, relative to where npm was launched (npm swallows an --outDir flag).
        outDir: process.env.WEB_OUT_DIR ? resolve(process.env.INIT_CWD ?? process.cwd(), process.env.WEB_OUT_DIR) : "dist",
        emptyOutDir: true,
    },
    plugins: [cWasm()],
})

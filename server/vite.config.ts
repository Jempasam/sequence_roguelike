import { defineConfig } from "vite"

export default defineConfig({
    publicDir: false,
    // The dependencies stay in node_modules, Vite's default for a server build: the server is deployed
    // with an npm install, not as a single file.
    ssr: { target: "node" },
    build: {
        ssr: "src/main.ts",
        target: "node22",
        outDir: "dist",
        emptyOutDir: true,
        minify: false,
        rollupOptions: {
            output: { format: "esm", entryFileNames: "main.js" },
        },
    },
})

import { defineConfig } from "vite"

// With its extension: Vite's native config loader, its next default, does not resolve bare paths.
import { cWasm } from "../core/build/cWasm.ts"
import { dataChannelBinding } from "./build/dataChannelBinding.ts"
import { nativeAddons } from "./build/nativeAddons.ts"

const RELEASE_DIRECTORY = `dist/${process.platform}-${process.arch}`

export default defineConfig(({ command }) => ({
    publicDir: false,
    ssr: {
        // Bundled whole for the release, since a SEA cannot require from node_modules. In dev, Node loads
        // the dependencies itself and Vite only transforms the workspace sources.
        noExternal: command === "build" ? true : undefined,
        target: "node",
    },
    build: {
        ssr: "src/main.ts",
        target: "node22",
        outDir: RELEASE_DIRECTORY,
        emptyOutDir: true,
        minify: false,
        rollupOptions: {
            output: { format: "cjs", entryFileNames: "main.cjs" },
            onwarn(warning, warn){
                // bit-twiddle, under @kmamal/gl, opens with a "use restrict" typo that means nothing.
                const isTwiddleTypo = warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.id?.includes("bit-twiddle")
                if(!isTwiddleTypo) warn(warning)
            },
        },
    },
    plugins: [cWasm(), dataChannelBinding(), nativeAddons()],
}))

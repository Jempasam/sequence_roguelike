import { defineConfig } from "vite"
import type { UserConfig } from "vite"

// With its extension: Vite's native config loader, its next default, does not resolve bare paths.
import { cWasm } from "../core/build/cWasm.ts"
import { dataChannelBinding } from "./build/dataChannelBinding.ts"
import { nativeAddons } from "./build/nativeAddons.ts"

const RELEASE_DIRECTORY = `dist/${process.platform}-${process.arch}`

/** The mode that builds the audio worker, a file of its own next to the bundle, instead of the game. */
const AUDIO_WORKER_MODE = "audioWorker"

export default defineConfig(({ command, mode }) => mode === AUDIO_WORKER_MODE ? audioWorkerConfig() : ({
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

/**
 * The worker of the audio: one CommonJS file in the release folder, bundled whole. It loads no addon by
 * itself, the main thread hands it the path of `sdl.node`, so it needs no plugin but the one for C.
 */
function audioWorkerConfig(): UserConfig {
    return {
        publicDir: false,
        ssr: { noExternal: true, target: "node" },
        build: {
            ssr: "src/platform/worker_audio/audioWorker.ts",
            target: "node22",
            outDir: RELEASE_DIRECTORY,
            emptyOutDir: false,
            minify: false,
            rollupOptions: { output: { format: "cjs", entryFileNames: "audioWorker.cjs" } },
        },
        plugins: [cWasm()],
    }
}

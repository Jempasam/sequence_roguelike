import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, createReadStream } from "node:fs"
import { extname, join, resolve, sep } from "node:path"
import type { Plugin, ResolvedConfig } from "vite"

const TYPES: Record<string, string> = {
    ".png": "image/png",
    ".ora": "application/zip",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
}

/**
 * Serves a second folder of assets as if it was the public directory, which Vite only takes one of: in dev
 * a file the public directory lacks is read from `directory`, in the build `directory` is copied into the
 * output. A path is in only one of them (`npm run assets` checks).
 * @param directory - The folder, such as generated_assets/, relative to the project root.
 */
export function generatedAssets(directory: string): Plugin {
    let config: ResolvedConfig
    let root = ""
    return {
        name: "generated-assets",
        configResolved(resolved){
            config = resolved
            // Like publicDir, relative to the project root.
            root = resolve(resolved.root, directory)
        },
        configureServer(server){
            server.middlewares.use((request, response, next) => {
                // Without the query (?v=BUILD_ID). In dev, Vite serves from "/" whatever the build's base.
                const path = decodeURIComponent((request.url ?? "").split("?")[0]).replace(/^\/+/, "")
                const file = resolve(root, path)
                const known = file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile()
                if(!known) return next()
                response.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream")
                createReadStream(file).pipe(response)
            })
        },
        closeBundle(){
            if(config.command !== "build" || !existsSync(root)) return
            copyTree(root, resolve(config.root, config.build.outDir))
        },
    }
}

function copyTree(from: string, to: string): void {
    mkdirSync(to, { recursive: true })
    for(const entry of readdirSync(from, { withFileTypes: true })){
        if(entry.isDirectory()) copyTree(join(from, entry.name), join(to, entry.name))
        else copyFileSync(join(from, entry.name), join(to, entry.name))
    }
}

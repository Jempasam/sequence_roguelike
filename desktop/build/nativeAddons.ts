import { cpSync } from "node:fs"
import { basename, dirname, join, resolve, sep } from "node:path"
import type { Plugin } from "vite"

const PREFIX = "\0native-addon:"

/**
 * Inside a SEA, `require` only loads Node's builtins, so the addons' JS is bundled and only their `.node`
 * files stay on disk. Each `require("../../dist/x.node")` becomes a load from native/<package>/ next to
 * the bundle, and the package's whole dist/ folder is copied there, because the addons load the DLLs
 * beside them. Node sets `__filename` to the executable inside a SEA, so `__dirname` is the release
 * folder whether the bundle runs as main.cjs or injected.
 */
export function nativeAddons(): Plugin {
    const directories = new Map<string, string>()
    let outDir = ""
    return {
        name: "native-addons",
        apply: "build",
        enforce: "pre",
        configResolved(config){
            outDir = resolve(config.root, config.build.outDir)
        },
        resolveId(source, importer){
            if(!source.endsWith(".node") || !importer) return null
            const file = resolve(dirname(importer), source)
            const name = packageNameOf(dirname(file))
            directories.set(dirname(file), name)
            return `${PREFIX}${name}/${basename(file)}`
        },
        load(id){
            if(!id.startsWith(PREFIX)) return null
            return [
                "const { createRequire } = require(\"node:module\")",
                "const { join } = require(\"node:path\")",
                `const file = join(__dirname, "native", ${JSON.stringify(id.slice(PREFIX.length))})`,
                "module.exports = createRequire(__filename)(file)",
            ].join("\n")
        },
        writeBundle(){
            for(const [source, name] of directories) cpSync(source, join(outDir, "native", name), { recursive: true })
        },
    }
}

/** `.../node_modules/@kmamal/sdl/dist` → `sdl`, so two addons never land in the same folder. */
function packageNameOf(directory: string): string {
    const parts = directory.split(sep)
    const at = parts.lastIndexOf("node_modules")
    if(at < 0) throw new Error(`Native addon outside node_modules: ${directory}`)
    const scoped = parts[at + 1].startsWith("@")
    return scoped ? parts[at + 2] : parts[at + 1]
}

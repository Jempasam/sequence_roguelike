import { createRequire } from "node:module"
import type { Plugin } from "vite"

/** The loader of node-datachannel's native addon, which looks for it at run time. */
const LOADER = /node-datachannel[\/]dist[\/](esm|cjs)[\/]lib[\/]node-datachannel\.(mjs|cjs)$/

/**
 * node-datachannel finds its addon at run time, by a `require` of a package named after the platform, which
 * a SEA cannot do and a bundler cannot follow. Its loader is replaced by a plain import of the addon of the
 * platform being built for, which {@link nativeAddons} then copies next to the bundle.
 */
export function dataChannelBinding(): Plugin {
    return {
        name: "data-channel-binding",
        apply: "build",
        enforce: "pre",
        load(id){
            if(!LOADER.test(id)) return null
            const addon = createRequire(import.meta.url).resolve(packageOfPlatform())
            return `import binding from ${JSON.stringify(addon)}\nexport default binding\n`
        },
    }
}

/** The package of node-datachannel's addon for the platform being built on, which is the one built for. */
function packageOfPlatform(): string {
    const { platform, arch } = process
    switch(platform){
        case "win32":
            return `@node-datachannel/win32-${arch}-msvc`
        case "darwin":
            return `@node-datachannel/darwin-${arch}`
        case "linux":
            // The musl builds exist too, but the releases target glibc distributions.
            return `@node-datachannel/linux-${arch}-gnu`
        default:
            throw new Error(`node-datachannel has no addon for ${platform}.`)
    }
}

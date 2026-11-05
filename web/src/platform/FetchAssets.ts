import type { AssetsPort } from "@game/core"

/**
 * Fetches the files shipped with the game from where the page is served. Vite serves assets/ as its
 * `publicDir`, without hashing the names.
 */
export class FetchAssets implements AssetsPort {


    constructor(
        /** The URL assets/ is served at, ending with `/`. */
        public readonly baseUrl: string,

        /**
         * The build the page belongs to. Without it in the URL, a browser could keep the old image in its
         * cache after a release, and show it next to the new code.
         */
        public readonly buildId: string,
    ){}


    public async read(path: string): Promise<Uint8Array> {
        const response = await fetch(`${this.baseUrl}${path}?v=${encodeURIComponent(this.buildId)}`)
        // fetch only rejects when the network fails, not on a 404.
        if(!response.ok) throw new Error(`${path} could not be fetched: HTTP ${response.status}.`)
        return new Uint8Array(await response.arrayBuffer())
    }
}

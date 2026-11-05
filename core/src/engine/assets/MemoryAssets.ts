import type { AssetsPort } from "../../platform"

/**
 * Files shipped with the game, held in memory, so the assets and the game are tested without a disk or a
 * browser.
 */
export class MemoryAssets implements AssetsPort {


    readonly #files: ReadonlyMap<string, Uint8Array>

    /**
     * @param files - The content of each file, by its path under assets/.
     */
    constructor(files: Readonly<Record<string, Uint8Array>> = {}){
        this.#files = new Map(Object.entries(files).map(([path, bytes]) => [path, bytes.slice()]))
    }


    public async read(path: string): Promise<Uint8Array> {
        const bytes = this.#files.get(path)
        if(!bytes) throw new Error(`${path} does not exist.`)
        // A copy, as a real read gives, so a consumer changing it does not change the next read.
        return bytes.slice()
    }
}

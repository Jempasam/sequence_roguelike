import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { AssetsPort } from "@game/core"

/**
 * Reads the files shipped with the game from the disk.
 */
export class FsAssets implements AssetsPort {


    constructor(
        /**
         * The folders that hold the assets, seen as one: the release's assets/, or the repo's assets/ and
         * generated_assets/ in dev. A file is read from the first that has it.
         */
        public readonly roots: readonly string[],
    ){}


    public async read(path: string): Promise<Uint8Array> {
        const file = this.roots.map(root => join(root, path)).find(existsSync) ?? join(this.roots[0], path)
        const buffer = await readFile(file)
        // A plain view, so a consumer never meets Buffer, whose slice does not copy as Uint8Array's does.
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    }
}

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { AssetsPort } from "@game/core"

/**
 * Reads the files shipped with the game from the disk.
 */
export class FsAssets implements AssetsPort {


    constructor(
        /** The folder that holds the assets: the release's assets/, or the repo's in dev. */
        public readonly root: string,
    ){}


    public async read(path: string): Promise<Uint8Array> {
        const buffer = await readFile(join(this.root, path))
        // A plain view, so a consumer never meets Buffer, whose slice does not copy as Uint8Array's does.
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    }
}

import { decodeOra, decodePng, OraError, PngError } from "../image"
import type { OraImage, PixelData } from "../image"
import type { AssetsPort } from "../../platform"

import { AssetError } from "./AssetError"
import type { AssetPath } from "./AssetPath"

/** The path of an image shipped with the game. */
export type ImagePath = Extract<AssetPath, `${string}.png`>

/** The path of an image of named layers shipped with the game, an OpenRaster file. */
export type LayeredImagePath = Extract<AssetPath, `${string}.ora`>

/**
 * Loads the files shipped with the game, by their typed path.
 *
 * @remarks
 * There is no cache: the consumer loads once and keeps what it got, an atlas its entries, the audio
 * engine its buffers. Each load is independent of the others, so a loading screen runs them in a
 * `Promise.all`, and the order they settle in decides nothing.
 *
 * Decoding blocks the thread it runs on. For pixel art images of a few KB, at load time, it does not
 * show, and `image` is already asynchronous for the day it moves to a worker.
 */
export class Assets {


    constructor(
        /** Where the bytes of the files come from. */
        public readonly port: AssetsPort,
    ){}


    /**
     * Load an image as pixels.
     *
     * @throws {@link AssetError} When the file cannot be read, is not a valid PNG, or is in a refused format.
     */
    public async image(path: ImagePath): Promise<PixelData> {
        const bytes = await this.bytes(path)
        try {
            return decodePng(bytes, path)
        } catch(error){
            if(error instanceof PngError) throw new AssetError(path, error.reason, error)
            throw error
        }
    }

    /**
     * Load an image of named layers, each as pixels.
     *
     * @throws {@link AssetError} When the file cannot be read, is not a valid OpenRaster, or is in a refused
     * format.
     */
    public async layeredImage(path: LayeredImagePath): Promise<OraImage> {
        const bytes = await this.bytes(path)
        try {
            return decodeOra(bytes, path)
        } catch(error){
            if(error instanceof OraError) throw new AssetError(path, error.reason, error)
            throw error
        }
    }

    /**
     * Load the raw bytes of a file, such as a sound the audio engine decodes itself.
     *
     * @throws {@link AssetError} When the file cannot be read.
     */
    public async bytes(path: AssetPath): Promise<Uint8Array> {
        try {
            return await this.port.read(path)
        } catch(error){
            throw new AssetError(path, "unreadable", error)
        }
    }
}

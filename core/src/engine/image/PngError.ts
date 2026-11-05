/**
 * Why a PNG could not be decoded:
 * - `"invalid"`: the bytes are not a well-formed PNG (bad signature, CRC, compressed data or palette index).
 * - `"unsupported"`: a well-formed PNG in a format the game refuses, 16-bit or interlaced. The export is
 *   fixed in the drawing tool.
 */
export type PngErrorReason = "invalid"|"unsupported"

/**
 * A PNG that could not be decoded, naming the image.
 */
export class PngError extends Error {


    constructor(
        /** Why the PNG could not be decoded. */
        public readonly reason: PngErrorReason,

        message: string,

        options?: ErrorOptions,
    ){
        super(message, options)
        this.name = "PngError"
    }
}

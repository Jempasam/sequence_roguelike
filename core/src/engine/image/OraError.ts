/**
 * Why an OpenRaster file could not be decoded:
 * - `"invalid"`: the bytes are not a well-formed OpenRaster (not a zip, no `stack.xml`, a layer missing).
 * - `"unsupported"`: a well-formed OpenRaster the game refuses, such as one with groups of layers. The
 *   export is fixed in the drawing tool.
 */
export type OraErrorReason = "invalid"|"unsupported"

/**
 * An OpenRaster file that could not be decoded, naming the image.
 */
export class OraError extends Error {


    constructor(
        /** Why the file could not be decoded. */
        public readonly reason: OraErrorReason,

        message: string,

        options?: ErrorOptions,
    ){
        super(message, options)
        this.name = "OraError"
    }
}

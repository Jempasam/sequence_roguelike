/**
 * Why an asset could not be loaded:
 * - `"unreadable"`: the platform could not read the file.
 * - `"invalid"`: the file was read, but its content is not what its extension says.
 * - `"unsupported"`: the file is well-formed, in a format the game refuses, such as a 16-bit PNG.
 */
export type AssetErrorReason = "unreadable"|"invalid"|"unsupported"

/**
 * An asset that could not be loaded. It always names the file, and keeps what went wrong as its cause.
 */
export class AssetError extends Error {


    constructor(
        /** The path of the file under assets/. */
        public readonly path: string,

        /** Why the file could not be loaded. */
        public readonly reason: AssetErrorReason,

        cause: unknown,
    ){
        super(`Could not load ${path}: ${messageOf(cause)}`, { cause })
        this.name = "AssetError"
    }
}

function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause)
}

/**
 * The step from one version of a save to the next. It works on JSON, not on a typed state: the type of
 * an old version no longer exists in the code, and a migration does not bring it back.
 */
export type Migration = (json: unknown) => unknown

/**
 * How a kind of save is written and read back: its version, the way up from each older version, and the
 * conversion between the state and its JSON.
 *
 * @example
 * ```ts
 * const RUN_FORMAT: SaveFormat<RunState> = {
 *     version: 3,
 *     migrations: [fromV1, fromV2],
 *     encode: state => ...,
 *     decode: json => ...,
 * }
 * ```
 */
export interface SaveFormat<T> {
    /** The version saves are written in, from 1 up. */
    readonly version: number

    /** The migration from version `i + 1` to `i + 2`, at index `i`. There are exactly `version - 1`. */
    readonly migrations: readonly Migration[]

    /**
     * The JSON value of a state. Anything JSON cannot hold is refused when saving: a map in a
     * `Uint8Array`, for instance, is turned into a base64 string here.
     */
    encode(state: T): unknown

    /**
     * The state a JSON value at the latest version holds. It checks everything it reads, and throws at the
     * first mismatch.
     */
    decode(json: unknown): T
}

/**
 * What is taken back when it is no longer wanted: a listener, a timer, a connection, a scope of those.
 *
 * @remarks
 * It is the only kind of handle: whoever registers something and has to undo it returns a `Removable`,
 * and a {@link Scope} keeps several to take them all back at once. Taking back twice does nothing.
 */
export interface Removable {
    /** Take it back. Removing twice does nothing. */
    remove(): void
}

/** The registration of a listener on an {@link Observable}, kept to take it back. */
export type Observer = Removable

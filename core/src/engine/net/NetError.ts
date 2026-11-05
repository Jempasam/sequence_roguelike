/**
 * Why a link could not be made, or was lost:
 * - `"unreachable"`: the other end could not be reached, or the connection to it was lost.
 * - `"protocol"`: the other end spoke out of turn: one of the two is not up to date, or broken.
 * - `"not-found"`, `"full"`, `"refused"`: the room has no such code, is full, or its owner refused.
 * - `"closed"`: the link was closed on purpose, by this end, the other one, or the server.
 */
export type NetErrorReason = "unreachable"|"protocol"|"not-found"|"full"|"refused"|"closed"

/** A link that could not be made, or was lost. */
export class NetError extends Error {


    constructor(
        public readonly reason: NetErrorReason,
        message: string,
        options?: ErrorOptions,
    ){
        super(message, options)
        this.name = "NetError"
    }
}

import type { IceServer } from "../protocol"
import type { TurnCredentials } from "../turn"

/** Where the STUN and TURN servers are reached, as the clients see them. */
export interface IceConfigOptions {
    /** The host name or address the clients reach the servers at. */
    readonly publicHost: string

    /** The port of STUN and TURN, over UDP and TCP. */
    readonly port: number

    /** The port of TURN over TLS, none when TLS is not served. */
    readonly tlsPort?: number

    /** The credentials of the TURN server, none when only STUN is served. */
    readonly credentials?: TurnCredentials
}

/**
 * The STUN and TURN servers each session is told about at its welcome, with TURN credentials of its own,
 * so no password is ever written in a client.
 */
export class IceConfig {


    constructor(
        public readonly options: IceConfigOptions,
    ){}


    /** The servers a session is to use, with credentials issued to it. */
    public serversFor(session: string): readonly IceServer[] {
        const { publicHost, port, tlsPort, credentials } = this.options
        const stun: IceServer = { urls: [`stun:${publicHost}:${port}`] }
        if(!credentials) return [stun]
        const urls = [`turn:${publicHost}:${port}?transport=udp`, `turn:${publicHost}:${port}?transport=tcp`]
        if(tlsPort !== undefined) urls.push(`turns:${publicHost}:${tlsPort}?transport=tcp`)
        return [stun, { urls, ...credentials.issue(session) }]
    }
}

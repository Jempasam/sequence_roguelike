import type { Server as HttpServer } from "node:http"
import type { AddressInfo } from "node:net"

import type { Cancel, TimerPort } from "@game/core"
import { PeerServer } from "peer"

/** Real time, for the signaling of a relay that keeps its own. */
export const REAL_TIMER: TimerPort = {
    after: (ms, run): Cancel => {
        const handle = setTimeout(run, ms)
        return { cancel: () => clearTimeout(handle) }
    },
    now: () => Date.now(),
}

/** A real PeerJS server on a free port of this host, as the relay of the `peerjs://` signaling. */
export interface PeerRelay {
    /** The address of the signaling, `peerjs://…`, to which a `prefix` may be added. */
    readonly url: string
    close(): Promise<void>
}

/** What the relay is configured with, of the options of the PeerJS server. */
export interface PeerRelayOptions {
    /** How long a message to an id nobody has waits before its sender is told, in milliseconds. */
    readonly expire_timeout?: number

    /** How long a client may be silent before it is forgotten, in milliseconds. */
    readonly alive_timeout?: number
}

/** Start a PeerJS server on a free port of this host. */
export async function startPeerRelay(options: PeerRelayOptions = {}): Promise<PeerRelay> {
    const server = await new Promise<HttpServer>(resolve => {
        PeerServer({ port: 0, path: "/", host: "127.0.0.1", ...options }, resolve)
    })
    const { port } = server.address() as AddressInfo
    return {
        url: `peerjs://127.0.0.1:${port}`,
        close: () => new Promise(resolve => {
            server.closeAllConnections()
            server.close(() => resolve())
        }),
    }
}

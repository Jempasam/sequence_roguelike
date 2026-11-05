import type { NetPort } from "@game/core"
import { RTCPeerConnection as DataChannelPeer } from "node-datachannel/polyfill"

/**
 * The network of Node: its own WebSocket, global since Node 22, and the peer connections of
 * node-datachannel, which copies the browser's API over libdatachannel.
 */
export class NodeNet implements NetPort {


    public openWebSocket(url: string): WebSocket {
        return new WebSocket(url)
    }

    public createPeer(config: RTCConfiguration): RTCPeerConnection {
        // WORKAROUND(sd): node-datachannel types ondatachannel with an event class of its own, whose #private
        // field makes it unassignable to the DOM's, though the event has the same fields at run time. The
        // conversion goes once its declarations take the DOM's event type.
        return new DataChannelPeer(config) as unknown as RTCPeerConnection
    }
}

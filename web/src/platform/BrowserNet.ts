import type { NetPort } from "@game/core"

/** The network of the browser: its own WebSocket and RTCPeerConnection. */
export class BrowserNet implements NetPort {


    public openWebSocket(url: string): WebSocket {
        return new WebSocket(url)
    }

    public createPeer(config: RTCConfiguration): RTCPeerConnection {
        return new RTCPeerConnection(config)
    }
}

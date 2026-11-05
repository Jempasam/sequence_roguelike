/**
 * The network of the environment: WebSockets to reach a server, WebRTC peer connections to reach other
 * players. The adapter only makes them, from the browser's own classes or from Node libraries that copy
 * their API, so everything built on them lives once in core, in `engine/net`.
 *
 * @remarks
 * Only data channels of WebRTC are used, no media. A Node library implements the standard interfaces,
 * which is why the port hands out the DOM types themselves.
 */
export interface NetPort {
    /** Open a WebSocket to a URL, `ws://` or `wss://`. */
    openWebSocket(url: string): WebSocket

    /** Make a WebRTC peer connection, with the STUN and TURN servers it gathers candidates from. */
    createPeer(config: RTCConfiguration): RTCPeerConnection
}

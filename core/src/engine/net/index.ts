/**
 * @packageDocumentation
 * The network, built once over the {@link NetPort} of the platform. Every link is a {@link Connection}:
 * {@link ClientSocket} to a server over WebSocket, {@link PeerConnection} to a player over WebRTC,
 * {@link MemoryConnection} within the program.
 *
 * Players meet in a {@link Room} of the signaling server, through a {@link SignalingClient}: a
 * {@link PTPHostSocket} owns a star room and each {@link PTPClientSocket} links to it, while a
 * {@link PTPSymSocket} links to every member of a mesh room. {@link NetSync} carries the messages of a game
 * from its main client to its viewers through such a room.
 */

export * from "./ClientSocket"
export * from "./Connection"
export * from "./MemoryConnection"
export * from "./NetError"
export * from "./NetSync"
export * from "./PeerConnection"
export * from "./PTPClientSocket"
export * from "./PTPHostSocket"
export * from "./PTPSymSocket"
export * from "./Room"
export * from "./SignalingClient"

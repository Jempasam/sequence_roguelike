/**
 * @packageDocumentation
 * The network, built once over the {@link NetPort} of the platform. Every link is a {@link Connection}:
 * {@link ClientSocket} to a server over WebSocket, {@link PeerConnection} to a player over WebRTC,
 * {@link MemoryConnection} within the program.
 *
 * Players meet in a {@link Room} of a {@link Signaling}, reached by the {@link SignalingConnector} that
 * {@link signalingAt} makes once: the server of the game, through a {@link SignalingClient}, or the relay of a
 * PeerJS server, through a {@link PeerJsSignaling}. A
 * {@link PTPHostSocket} owns a star room and each {@link PTPClientSocket} links to it, while a
 * {@link PTPSymSocket} links to every member of a mesh room. {@link NetSync} carries the messages of a game
 * from its main client to its viewers through such a room, and those of a guest back to the main client.
 */

export * from "./ClientSocket"
export * from "./Connection"
export * from "./Fault"
export * from "./Listeners"
export * from "./MemoryConnection"
export * from "./NetError"
export * from "./NetFaults"
export * from "./NetSync"
export * from "./Outbox"
export * from "./QueuedPeer"
export * from "./Scheduler"
export * from "./Session"
export * from "./SessionClient"
export * from "./SessionHost"
export * from "./SessionPeer"
export * from "./PeerConnection"
export * from "./PTPClientSocket"
export * from "./PTPHostSocket"
export * from "./PTPSharedSocket"
export * from "./PTPSymSocket"
export * from "./PeerJsConnection"
export * from "./PeerJsSignaling"
export * from "./Room"
export * from "./Signaling"
export * from "./SignalingClient"
export * from "./signalingAt"

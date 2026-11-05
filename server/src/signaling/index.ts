/**
 * @packageDocumentation
 * Matchmaking over WebSocket: {@link SignalingServer} greets each {@link Session}, opens the {@link Room}s
 * of the {@link RoomRegistry} and passes WebRTC offers, answers and ICE candidates between their members,
 * telling each one the STUN and TURN servers of its {@link IceConfig}.
 */

export * from "./IceConfig"
export * from "./Room"
export * from "./RoomRegistry"
export * from "./Session"
export * from "./SignalingServer"

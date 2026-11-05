/**
 * @packageDocumentation
 * The protocol between the clients and the signaling server: the {@link ClientMessage}s a client sends,
 * the {@link ServerMessage}s the server answers, and their checked (de)serialization. Plain TypeScript,
 * free of Node, so core imports it as `@game/server/protocol`, the one part of the server it may reach.
 */

export * from "./codec"
export * from "./messages"

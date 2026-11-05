/**
 * @packageDocumentation
 * The ports core declares and the adapters implement: {@link Platform} groups them, {@link GfxPort} is
 * the drawing surface, {@link LoopPort} drives the frames, {@link InputPort} reads the keyboard, the mouse
 * and the gamepads, {@link ClipboardPort} is the clipboard of the system, {@link AssetsPort} reads the files
 * shipped with the game, {@link StoragePort} holds the data of the player, {@link NetPort} makes WebSockets
 * and WebRTC connections, and {@link SyncPort} carries the messages between the clients of one game.
 */

export * from "./AssetsPort"
export * from "./ClipboardPort"
export * from "./GfxPort"
export * from "./InputPort"
export * from "./LoopPort"
export * from "./NetPort"
export * from "./Platform"
export * from "./StoragePort"
export * from "./SyncPort"

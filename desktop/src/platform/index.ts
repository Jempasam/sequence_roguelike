/**
 * @packageDocumentation
 * The desktop adapters of core's ports: {@link SdlGfx} for the window, {@link SdlLoop} for the frames and
 * {@link SdlInput} for the keyboard, the mouse and the controllers, {@link SdlClipboard} for the
 * clipboard, on SDL, {@link FsAssets} for the files shipped with the game and {@link FsStorage} for the
 * data of the player, on the file system, and {@link NodeNet} for the network.
 */

export * from "./FsAssets"
export * from "./FsStorage"
export * from "./NodeNet"
export * from "./SdlClipboard"
export * from "./SdlGfx"
export * from "./SdlInput"
export * from "./SdlLoop"

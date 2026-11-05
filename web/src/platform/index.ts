/**
 * @packageDocumentation
 * The browser adapters of core's ports: {@link WebGfx} for the canvas, {@link WebLoop} for the frames,
 * {@link WebInput} for the keyboard, the mouse and the gamepads, {@link WebClipboard} for the clipboard,
 * {@link FetchAssets} for the files shipped with the game, {@link IndexedDbStorage} for the data of the
 * player, {@link BrowserNet} for the network and {@link TabSync} for the tabs watching the game.
 */

export * from "./BrowserNet"
export * from "./FetchAssets"
export * from "./IndexedDbStorage"
export * from "./TabSync"
export * from "./WebClipboard"
export * from "./WebGfx"
export * from "./WebInput"
export * from "./WebLoop"

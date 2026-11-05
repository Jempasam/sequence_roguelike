/**
 * @packageDocumentation
 * The files shipped with the game. {@link Assets} loads them through the {@link AssetsPort} of the
 * platform, by an {@link AssetPath} generated from assets/ by `npm run assets`, and fails with an
 * {@link AssetError} naming the file. {@link MemoryAssets} holds them in memory for the tests.
 */

export * from "./AssetError"
export type * from "./AssetPath"
export * from "./Assets"
export * from "./MemoryAssets"

/**
 * @packageDocumentation
 * The data of the player. A {@link SaveSlot} keeps one thing under its own key, in a {@link SaveFormat}
 * that carries its version and migrations, and fails with a {@link SaveError} when a save cannot be
 * read back. {@link MemoryStorage} holds the saves in memory for the tests.
 */

export * from "./MemoryStorage"
export * from "./SaveError"
export * from "./SaveFormat"
export * from "./SaveSlot"

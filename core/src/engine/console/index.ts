/**
 * @packageDocumentation
 * The console, for any game: {@link Command} is what a game registers, {@link Console} runs and completes
 * them without a screen, and {@link ConsoleView} draws it over the game. {@link command} and {@link group}
 * build commands from typed arguments.
 */

export * from "./Command"
export * from "./commands"
export * from "./Console"
export * from "./ConsoleView"

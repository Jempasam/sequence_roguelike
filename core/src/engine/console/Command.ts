/** What every command can do, whatever the game: print a line in the console. */
export interface CommandContext {
    /** Write a line in the console, as what the command says. */
    print(text: string): void
}

/**
 * A command of the console: it completes what is being typed, reads its arguments, then runs.
 *
 * @remarks
 * Reading and running are apart, so the console tells a command that would fail before it is entered: the
 * line shows in red while `parse` gives an error. Running never reads the arguments again.
 *
 * @typeParam C - What the commands run with: the game, and the console to print in.
 * @typeParam P - What `parse` reads the arguments into, for `execute`.
 */
export interface Command<C extends CommandContext, P = unknown> {
    /** What it does and how it is typed, for the help: `"heal <unit> [halves] : soigne une unité."`. */
    readonly usage: string

    /** More lines of help, shown when its own is asked for: the usage of each sub-command. */
    readonly details?: readonly string[]

    /**
     * What the argument being typed, the last one, may become: the console offers them, filtered by what
     * is typed already.
     *
     * @param args - The arguments typed, the last one maybe empty or half typed.
     */
    complete(ctx: C, args: readonly string[]): string[]

    /** Read the arguments, or say why they cannot be. */
    parse(ctx: C, args: readonly string[]): P|Error

    /** Run with what `parse` read. */
    execute(ctx: C, parsed: P): void
}

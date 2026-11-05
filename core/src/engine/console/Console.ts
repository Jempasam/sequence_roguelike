import type { Command, CommandContext } from "./Command"

/** What a line of the console is: printed by a command, a command entered, or an error. */
export type ConsoleLineKind = "output"|"command"|"error"

/** A line of the console. */
export interface ConsoleLine {
    readonly text: string
    readonly kind: ConsoleLineKind
}

/** How a line being typed stands: nothing yet, an unknown name, or a known one that parses or not. */
export interface LineCheck {
    /** The name typed, empty while nothing is. */
    readonly name: string

    /** Is the name the one of a command? */
    readonly known: boolean

    /** Would the line run: a known command whose arguments parse? */
    readonly valid: boolean

    /** Why it would not, none when it would or nothing is typed. */
    readonly error: string|null
}

/** How many lines the console keeps: the oldest go first. */
export const MAX_CONSOLE_LINES = 200

/**
 * The commands of a game, what they printed, and what was entered: the console without its screen.
 *
 * @remarks
 * A line is a command name, then its arguments, split on spaces. The console completes the name from its
 * commands, then each argument from the command itself. Kept apart from its view, so it is tested without
 * a screen, and the view only draws it.
 */
export class Console<C extends CommandContext> {


    /** The commands, by the name they are typed with. */
    public readonly commands = new Map<string, Command<C, unknown>>()

    /** What was printed, entered and failed, the oldest first. */
    public readonly lines: ConsoleLine[] = []

    /** The lines entered, the oldest first, each once in a row. */
    public readonly history: string[] = []

    /** What hears that the lines changed, one added or all cleared, nothing when none. */
    public onChange: (() => void)|null = null

    constructor(
        /** What the commands run with. */
        public readonly context: C,
    ){}


    /**
     * Add a command under a name.
     *
     * @throws {@link Error} When a command already has that name, or the name holds a space.
     */
    public register<P>(name: string, command: Command<C, P>): void {
        if(/\s/.test(name)) throw new Error(`A command name holds no space, unlike "${name}".`)
        if(this.commands.has(name)) throw new Error(`The console already has a command "${name}".`)
        this.commands.set(name, command)
    }

    /** Write a line in the console. */
    public print(text: string, kind: ConsoleLineKind = "output"): void {
        this.lines.push({ text, kind })
        if(this.lines.length > MAX_CONSOLE_LINES) this.lines.splice(0, this.lines.length - MAX_CONSOLE_LINES)
        this.onChange?.()
    }

    /** Forget every line printed. The history of what was entered stays. */
    public clear(): void {
        this.lines.length = 0
        this.onChange?.()
    }

    /** How a line being typed stands, for its colors. */
    public check(line: string): LineCheck {
        const [name, ...args] = tokensOf(line)
        if(!name) return { name: "", known: false, valid: false, error: null }
        const command = this.commands.get(name)
        if(!command) return { name, known: false, valid: false, error: `Commande inconnue : ${name}` }
        const parsed = command.parse(this.context, args)
        if(parsed instanceof Error) return { name, known: true, valid: false, error: parsed.message }
        return { name, known: true, valid: true, error: null }
    }

    /**
     * Run a line: written as entered, remembered in the history, then its command reads its arguments and
     * runs, or the error says why not. An empty line does nothing.
     */
    public submit(line: string): void {
        const typed = line.trim()
        if(!typed) return
        if(this.history.at(-1) !== typed) this.history.push(typed)
        this.print(typed, "command")
        const [name, ...args] = tokensOf(typed)
        const command = this.commands.get(name)
        if(!command){
            this.print(`Commande inconnue : ${name}. Tape help pour la liste.`, "error")
            return
        }
        const parsed = command.parse(this.context, args)
        if(parsed instanceof Error){
            this.print(parsed.message, "error")
            return
        }
        try {
            command.execute(this.context, parsed)
        } catch(error){
            this.print(error instanceof Error ? error.message : String(error), "error")
        }
    }

    /**
     * What the word being typed may become: a command name while the name is typed, then what the command
     * offers for its argument, each starting with what is typed already.
     */
    public suggestions(line: string): string[] {
        const tokens = tokensOf(line, true)
        const typed = tokens.at(-1) ?? ""
        const offered = tokens.length <= 1
            ? [...this.commands.keys()]
            : this.commands.get(tokens[0])?.complete(this.context, tokens.slice(1)) ?? []
        const lower = typed.toLowerCase()
        return [...new Set(offered)].filter(word => word.toLowerCase().startsWith(lower)).sort()
    }

    /** The line with the word being typed replaced by a suggestion, and a space after it. */
    public completed(line: string, suggestion: string): string {
        const tokens = tokensOf(line, true)
        tokens[Math.max(0, tokens.length - 1)] = suggestion
        return `${tokens.join(" ")} `
    }
}

/**
 * The words of a line, split on spaces.
 *
 * @param typing - Is the line being typed? A space at its end then starts an empty word, the one being
 * typed.
 */
export function tokensOf(line: string, typing = false): string[] {
    const words = line.trim().split(/\s+/).filter(word => word.length > 0)
    if(typing && (words.length === 0 || /\s$/.test(line))) words.push("")
    return words
}

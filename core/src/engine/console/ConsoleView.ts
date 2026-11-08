import { Color } from "../math"
import { TextLayout } from "../text"
import { Box, Label, NineSlice, Panel, TextInput } from "../ui"
import type { Theme, TextSpan, UiEvent } from "../ui"

import type { CommandContext } from "./Command"
import type { Console, ConsoleLineKind } from "./Console"

/** The color behind the console: nearly opaque, so the game under it does not blur its lines. */
const BACKGROUND = new Color(0.03, 0.02, 0.06, 0.97)

/** The color of a command name known. */
const NAME_COLOR = new Color(1, 0.85, 0.35)

/** The color of a line that would run. */
const VALID_COLOR = new Color(0.95, 0.95, 0.95)

/** The color of a line that would not run, and of the errors. */
const INVALID_COLOR = new Color(1, 0.4, 0.35)

/** The color of the lines entered, written back in the console. */
const ENTERED_COLOR = new Color(0.55, 0.53, 0.63)

/** The color of the suggestion chosen with `tab`. */
const CHOSEN_COLOR = new Color(1, 0.85, 0.35)

/** The color of the other suggestions. */
const SUGGESTION_COLOR = new Color(0.55, 0.53, 0.63)

/** The height of what is not the lines printed, in virtual pixels: frame, suggestions, line typed. */
const CHROME = 40

/** The space around the console, inside its frame, in virtual pixels. */
const PADDING = 4

/** The space between two suggestions, in virtual pixels. */
const SUGGESTION_GAP = 4

/** What stands before the suggestions shown when some come before them. */
const BEFORE_MARK = "…"

/** The physical key that opens and closes the console: the one left of `1`, `²` or `` ` ``. */
export const CONSOLE_KEY = "Backquote"

/** The physical key that opens the console too: the one an AZERTY keyboard marks `:` and `/`. */
export const CONSOLE_SECOND_KEY = "Period"

/** The color each kind of line is written in. */
const LINE_COLORS: Readonly<Record<ConsoleLineKind, Color>> = {
    output: VALID_COLOR, command: ENTERED_COLOR, error: INVALID_COLOR,
}

/**
 * The console over the screen: what was printed, entered and failed above, the suggestions, and the line
 * being typed.
 *
 * @remarks
 * The line is colored as it is typed: the command name in yellow when known, the rest in white when it
 * would run, in red when not. `up` and `down` go through the lines entered before, `tab` goes through the
 * suggestions, and `enter` puts the one chosen in the line, or runs the line when none is chosen. `escape`
 * or the console key closes it, and so does the line losing the focus to anything but the console: a
 * click on the console gives it back to the line.
 */
export class ConsoleView<C extends CommandContext> extends Panel {


    /** What closing it does, nothing when none. */
    public onClose: (() => void)|null = null

    constructor(
        theme: Theme,
        public readonly console: Console<C>,
    ){
        super(theme, { padding: PADDING, background: NineSlice.flat(theme.white, BACKGROUND) })
        this.#layout = new TextLayout(theme.font, theme.textScale)
        const column = new Box("column", { gap: 2 })
        this.#output = new Box("column", { gap: 0 })
        this.#suggestions = new Box("row", { gap: SUGGESTION_GAP })
        this.#input = new ConsoleInput(theme, this)
        column.add(this.#output, { grow: 1 })
        column.add(this.#suggestions)
        column.add(this.#input)
        this.content = column
        console.onChange = () => this.#showOutput()
        this.#showOutput()
        this.#suggest("")
    }


    /**
     * Take a size, in virtual pixels: it shows as many of the lines printed as fit, the latest at the
     * bottom. Taking the size it has does nothing.
     */
    public resize(width: number, height: number): void {
        const size = this.fixedSize
        if(size?.width === width && size.height === height) return
        this.fixedSize = { width, height }
        const line = this.theme.font.lineHeight * this.theme.textScale
        this.#rows = Math.max(1, Math.floor((height - CHROME) / line))
        this.#showOutput()
        this.#showSuggestions()
    }

    /** Give the line being typed the focus, ready to type. */
    public open(): void {
        this.visible = true
        this.#input.focus()
    }

    /** Hide it. Closing it closed does nothing. */
    public close(): void {
        // Hiding it takes the focus from the line before it is hidden, which asks to close it again.
        if(!this.visible || this.#closing) return
        this.#closing = true
        this.visible = false
        this.#closing = false
        this.onClose?.()
    }


    // A click on it hits it rather than the game under it, and takes the focus, which it gives the line.
    protected override get interactive(): boolean {
        return true
    }

    protected override get focusable(): boolean {
        return true
    }

    protected override get showsFocus(): boolean {
        return false
    }

    protected override focusChanged(): void {
        if(this.focused) this.#input.focus()
    }


    /** How many of the lines printed it shows. */
    #rows = 1

    /** Is it being closed? */
    #closing = false

    readonly #layout: TextLayout
    readonly #output: Box
    readonly #suggestions: Box
    readonly #input: ConsoleInput<C>

    /** What the word being typed may become, and the one chosen with `tab`, none at first. */
    #offered: string[] = []
    #chosen = -1

    /** The first suggestion shown: the row scrolls so the one chosen always shows. */
    #first = 0

    /** Where the history is gone back to, its length when it is not. */
    #back = 0

    //// What the line asks ////

    /** The colors of a line: its name in yellow when known, the rest in white or red. */
    public colorsOf(text: string): TextSpan[] {
        const check = this.console.check(text)
        if(!check.name) return []
        // In characters, as the field counts them, not in code units.
        const start = [...text.slice(0, text.indexOf(check.name))].length
        const end = start + [...check.name].length
        const rest = check.valid ? VALID_COLOR : INVALID_COLOR
        const length = [...text].length
        if(!check.known) return [{ start, end: length, color: INVALID_COLOR }]
        return [{ start, end, color: NAME_COLOR }, { start: end, end: length, color: rest }]
    }

    /** Hear that the line changed: offer what the word being typed may become. */
    public changed(text: string): void {
        this.#suggest(text)
    }

    /** Choose the next suggestion, or the one before. */
    public cycle(backward: boolean): void {
        const count = this.#offered.length
        if(count === 0) return
        this.#chosen = backward
            ? (this.#chosen <= 0 ? count : this.#chosen) - 1
            : (this.#chosen + 1) % count
        this.#showSuggestions()
    }

    /** Put the suggestion chosen in the line, or run the line when none is chosen. */
    public enter(): void {
        const suggestion = this.#offered[this.#chosen]
        if(suggestion !== undefined){
            this.#input.text = this.console.completed(this.#input.text, suggestion)
            return
        }
        this.console.submit(this.#input.text)
        this.#back = this.console.history.length
        this.#input.text = ""
    }

    /** Go back through the lines entered, or forth toward an empty line. */
    public browse(back: boolean): void {
        const history = this.console.history
        this.#back = Math.max(0, Math.min(history.length, this.#back + (back ? -1 : 1)))
        this.#input.text = history[this.#back] ?? ""
    }

    #suggest(text: string): void {
        this.#offered = this.console.suggestions(text)
        this.#chosen = -1
        this.#first = 0
        this.#showSuggestions()
    }

    /**
     * Show the suggestions that fit on the row, from the first one shown, scrolled so the one chosen shows:
     * a mark before them when some come before, and how many are left after them.
     */
    #showSuggestions(): void {
        for(const child of [...this.#suggestions.children]) this.#suggestions.remove(child)
        const [first, end] = this.#window()
        this.#first = first
        if(first > 0) this.#suggestions.add(new Label(this.theme, BEFORE_MARK, { color: SUGGESTION_COLOR }))
        for(let index = first; index < end; index++){
            const color = index === this.#chosen ? CHOSEN_COLOR : SUGGESTION_COLOR
            this.#suggestions.add(new Label(this.theme, this.#shown(index), { color }))
        }
        const left = this.#offered.length - end
        if(left > 0){
            this.#suggestions.add(new Label(this.theme, afterMark(left), { color: SUGGESTION_COLOR }))
        }
    }

    /** How a suggestion is written: the one chosen between brackets. */
    #shown(index: number): string {
        const word = this.#offered[index]
        return index === this.#chosen ? `[${word}]` : word
    }

    /**
     * The suggestions shown, from the first to before the end: as many as fit in the width from the first
     * shown before, moved just enough for the one chosen to be among them. At least one, even too wide.
     */
    #window(): [number, number] {
        const count = this.#offered.length
        const chosen = this.#chosen
        let first = Math.min(this.#first, Math.max(0, count - 1))
        if(chosen >= 0 && chosen < first) first = chosen
        let end = this.#endFrom(first)
        if(chosen >= end){
            // Scrolled forward: the one chosen comes last, with as many before it as fit.
            first = chosen
            while(first > 0 && this.#fits(first - 1, chosen + 1)) first--
            end = this.#endFrom(first)
        }
        return [first, end]
    }

    /** Where the suggestions shown from one end: the most that fit, one at least. */
    #endFrom(first: number): number {
        let end = Math.min(first + 1, this.#offered.length)
        while(end < this.#offered.length && this.#fits(first, end + 1)) end++
        return end
    }

    /** Do the suggestions from one to before another fit in the row, with the marks they need? */
    #fits(first: number, end: number): boolean {
        const widths: number[] = []
        if(first > 0) widths.push(this.#layout.widthOf(BEFORE_MARK))
        for(let index = first; index < end; index++) widths.push(this.#layout.widthOf(this.#shown(index)))
        const left = this.#offered.length - end
        if(left > 0) widths.push(this.#layout.widthOf(afterMark(left)))
        const total = widths.reduce((sum, width) => sum + width, 0) + SUGGESTION_GAP * (widths.length - 1)
        return total <= this.#room
    }

    /** The width of the row of suggestions, in virtual pixels: the whole width, before any size is taken. */
    get #room(): number {
        const width = this.fixedSize?.width
        return width === undefined ? Infinity : width - 2 * PADDING
    }

    #showOutput(): void {
        for(const child of [...this.#output.children]) this.#output.remove(child)
        for(const line of this.console.lines.slice(-this.#rows)){
            const text = line.kind === "command" ? `> ${line.text}` : line.text
            this.#output.add(new Label(this.theme, text, { color: LINE_COLORS[line.kind] }))
        }
    }
}

/** What stands after the suggestions shown when some are left after them: how many. */
function afterMark(left: number): string {
    return `… +${left}`
}

/** The line typed in the console: a text field giving the keys of history, suggestions and closing to it. */
class ConsoleInput<C extends CommandContext> extends TextInput {


    constructor(
        theme: Theme,
        public readonly view: ConsoleView<C>,
    ){
        // The key of the console types its own character: kept out of the line.
        super(theme, {
            accepts: character => !["²", "`", ":", "/"].includes(character),
            colors: text => view.colorsOf(text),
        })
        this.onChange = text => view.changed(text)
    }


    // The caret tells the line has the focus: a ring over it would hide the colors of the line.
    protected override get showsFocus(): boolean {
        return false
    }

    /** Losing the focus closes the console, unless the console took it, to give it back. */
    protected override focusChanged(): void {
        super.focusChanged()
        if(!this.focused && !this.view.focused) this.view.close()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "key-down"){
            super.handle(event)
            return
        }
        switch(event.code){
            case "ArrowUp":
            case "ArrowDown":
                this.view.browse(event.code === "ArrowUp")
                break
            case "Tab":
                this.view.cycle(event.shift)
                break
            case "Enter":
            case "NumpadEnter":
                this.view.enter()
                break
            case "Escape":
            case CONSOLE_KEY:
                this.view.close()
                break
            default:
                super.handle(event)
                return
        }
        event.consume()
    }
}

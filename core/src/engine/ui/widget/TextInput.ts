import type { Painter } from "../../gpu"
import type { Color } from "../../math"
import { TextLayout } from "../../text"

import { Component } from "../Component"
import type { UiEvent } from "../input/UiEvent"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How long the cursor stays shown, then hidden, in seconds. */
export const CURSOR_BLINK = 0.5

/** The width of the cursor, in virtual pixels. */
const CURSOR_WIDTH = 1

/**
 * The keys a field leaves to the `ui` table, so the focus can leave it: `up` and `down` move to the
 * widgets around, `tab` to the next one. Every other key pressed is taken, so none reaches the gameplay.
 */
const PASSING_KEYS: ReadonlySet<string> = new Set(["ArrowUp", "ArrowDown", "Tab"])

/**
 * The keys that act again while held, at the pace the OS repeats them, as the characters typed do: those
 * that erase and those that move the cursor. Committing, cancelling or pasting happens once per press.
 */
const REPEATING_KEYS: ReadonlySet<string> = new Set(["Backspace", "Delete", "ArrowLeft", "ArrowRight"])

/** Is a character a space, a tab or another blank? */
function isSpace(character: string): boolean {
    return /\s/.test(character)
}

/** A part of a text drawn in a color of its own, from its first character to the one after its last. */
export interface TextSpan {
    readonly start: number
    readonly end: number
    readonly color: Color
}

/** How a text field is set up beyond its theme. */
export interface TextInputOptions {
    /** Its text at first, empty by default. */
    readonly text?: string

    /** The most characters it holds, no limit by default. */
    readonly maxLength?: number

    /** Is a character typed or pasted accepted? Every one by default. */
    readonly accepts?: (character: string) => boolean

    /**
     * The parts of the text drawn in a color of their own, read again at each drawing, so they follow the
     * text as it is typed: a command name, an error. The rest is in the color of the theme. None by
     * default.
     */
    readonly colors?: (text: string) => readonly TextSpan[]
}

/**
 * One line of text input, with a cursor, a selection, and the clipboard.
 *
 * @remarks
 * The text comes from the text events of the frame, not from the keys: an `é` or an `@` depend on the
 * layout of the keyboard, which only the system knows. The keys it takes do not count as held for the
 * gameplay, so a `z` typed never moves the character.
 *
 * `enter` or losing the focus commits the text, `escape` cancels and brings back the text from before.
 * Erasing and moving the cursor repeat while their key is held, as fast as the OS repeats the characters.
 * With `ctrl`, `backspace` and `delete` erase, and the arrows move over, a whole word, or all the spaces
 * when the cursor stands against spaces.
 * The text scrolls sideways to keep the cursor in view, and only the characters wholly in view are drawn.
 * There is neither input method nor virtual keyboard, since there is no DOM: typing Japanese, or on a
 * phone, does not work.
 */
export class TextInput extends Component {


    /** What hears of each commit, with the text committed, nothing when none. */
    public onCommit: ((text: string) => void)|null = null

    /** What hears of each change of the text, typed or set, with the new text, nothing when none. */
    public onChange: ((text: string) => void)|null = null

    /**
     * What hears that the clipboard refused a copy or a paste, nothing when none. The web one asks for a
     * gesture of the user, so it may. A refusal nobody hears is thrown, so it is never silent.
     */
    public onClipboardFailed: ((error: unknown) => void)|null = null

    /** The most characters it holds. */
    public readonly maxLength: number

    /** Is a character typed or pasted accepted? */
    public readonly accepts: (character: string) => boolean

    constructor(
        /** The look of the field. */
        public readonly theme: Theme,

        options: TextInputOptions = {},
    ){
        super()
        this.#layout = new TextLayout(theme.font, theme.textScale)
        this.maxLength = options.maxLength ?? Infinity
        this.accepts = options.accepts ?? (() => true)
        this.#colors = options.colors ?? null
        this.#characters = [...options.text ?? ""]
        this.#before = this.text
        this.#cursor = this.#characters.length
        this.#anchor = this.#cursor
    }


    /**
     * The text held. Setting it, the cursor goes to its end, and it becomes the text an `escape` brings
     * back. Setting the same one does nothing.
     */
    public get text(): string { return this.#characters.join("") }

    public set text(text: string){
        this.#before = text
        if(text === this.text) return
        this.#characters = [...text]
        this.#cursor = this.#characters.length
        this.#anchor = this.#cursor
        this.#keepCursorInView()
        this.invalidate()
        this.onChange?.(text)
    }

    /** The selection, from its start to its end, in characters, both equal when nothing is selected. */
    public get selectionStart(): number { return Math.min(this.#cursor, this.#anchor) }
    public get selectionEnd(): number { return Math.max(this.#cursor, this.#anchor) }

    /** Commit the text: the commit is told, and the text becomes the one an `escape` brings back. */
    public commit(): void {
        this.#before = this.text
        this.onCommit?.(this.text)
    }

    /** Bring back the text of the last commit, or of when the field took the focus. */
    public cancel(): void {
        this.text = this.#before
    }


    protected override get interactive(): boolean {
        return true
    }

    protected override get focusable(): boolean {
        return true
    }

    protected computeHint(): SizeHint {
        const { padding, width } = this.theme.textInput
        const height = this.#layout.lineHeight + 2 * padding
        return sizeHint(2 * padding + this.#layout.lineHeight, height, width, height)
    }

    protected override arranged(): void {
        this.#keepCursorInView()
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const { background, padding, selectionColor, cursorColor } = this.theme.textInput
        background.draw(painter, 0, 0, width, height)
        const layout = this.#layout
        const top = Math.floor((height - layout.lineHeight) / 2)
        const left = padding - this.#scroll
        const inner = this.#innerWidth()
        const isEditing = this.focused
        painter.setWhitePixel(this.theme.white)
        if(isEditing && this.selectionStart !== this.selectionEnd){
            const start = Math.max(padding, left + this.#offsetOf(this.selectionStart))
            const end = Math.min(padding + inner, left + this.#offsetOf(this.selectionEnd))
            painter.setTint(selectionColor)
            if(end > start) painter.rect(start, top, end - start, layout.lineHeight)
        }
        const [first, last] = this.#charactersInView()
        painter.setTint(this.theme.textColor)
        layout.draw(painter, this.#characters.slice(first, last).join(""), left + this.#offsetOf(first), top)
        // The colored parts are drawn again over the text, each cut to what is in view.
        for(const span of this.#colors?.(this.text) ?? []){
            const start = Math.max(first, span.start)
            const end = Math.min(last, span.end)
            if(end <= start) continue
            painter.setTint(span.color)
            layout.draw(painter, this.#characters.slice(start, end).join(""), left + this.#offsetOf(start), top)
        }
        if(isEditing && this.#cursorShown){
            const cursor = this.#cursorRect(this.#cursorArea)
            painter.setTint(cursorColor)
            painter.rect(cursor.x, cursor.y, cursor.width, cursor.height)
        }
        if(this.showsFocus) this.theme.focusRing.draw(painter, 0, 0, width, height)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "text":
                this.#insert(event.text)
                event.consume()
                break
            case "key-down":
                if(PASSING_KEYS.has(event.code)) break
                this.#press(event)
                event.consume()
                break
            case "key-repeat":
                if(!REPEATING_KEYS.has(event.code)) break
                this.#press(event)
                event.consume()
                break
            case "pointer-down":
                if(event.button !== 0) break
                this.#dragging = true
                this.#moveCursor(this.#indexAt(event.x), event.shift)
                event.consume()
                break
            case "pointer-move":
                if(!this.#dragging) break
                this.#moveCursor(this.#indexAt(event.x), true)
                event.consume()
                break
            case "pointer-up":
                if(event.button !== 0) break
                this.#dragging = false
                event.consume()
                break
            default:
                break
        }
    }

    protected override focusChanged(): void {
        if(this.focused){
            this.#before = this.text
            this.#blink = 0
            this.#cursorShown = true
            this.ticking = true
        } else {
            this.ticking = false
            this.#dragging = false
            this.#anchor = this.#cursor
            this.commit()
        }
        this.invalidate()
    }

    protected override tick(dt: number): void {
        this.#blink += dt
        if(this.#blink < CURSOR_BLINK) return
        this.#blink %= CURSOR_BLINK
        this.#cursorShown = !this.#cursorShown
        this.invalidateArea(this.#cursorRect(this.#cursorArea))
    }


    readonly #layout: TextLayout

    /** The parts of the text in a color of their own, none when the text has a single color. */
    readonly #colors: ((text: string) => readonly TextSpan[])|null

    /** The text, one code point per element, so the cursor never lands inside a character. */
    #characters: string[]

    /** The text an `escape` brings back. */
    #before: string

    /** Where the cursor is, and where the selection started, in characters. */
    #cursor: number
    #anchor: number

    /** How far the text is scrolled to the left, in virtual pixels, to keep the cursor in view. */
    #scroll = 0

    #blink = 0
    #cursorShown = true
    #dragging = false
    readonly #cursorArea = new Rect()

    #press(event: UiEvent): void {
        const length = this.#characters.length
        switch(event.code){
            case "ArrowLeft": {
                // A selection dropped puts the cursor at its edge, as text fields do.
                const step = event.control ? this.#runStart(this.#cursor) : this.#cursor - 1
                const target = this.#dropsSelection(event) ? this.selectionStart : step
                this.#moveCursor(target, event.shift)
                break
            }
            case "ArrowRight": {
                const step = event.control ? this.#runEnd(this.#cursor) : this.#cursor + 1
                const target = this.#dropsSelection(event) ? this.selectionEnd : step
                this.#moveCursor(target, event.shift)
                break
            }
            case "Home":
                this.#moveCursor(0, event.shift)
                break
            case "End":
                this.#moveCursor(length, event.shift)
                break
            case "Backspace":
                if(!this.#hasSelection()){
                    const cursor = this.#cursor
                    this.#anchor = event.control ? this.#runStart(cursor) : Math.max(0, cursor - 1)
                }
                this.#replaceSelection([])
                break
            case "Delete":
                if(!this.#hasSelection()){
                    const cursor = this.#cursor
                    this.#anchor = event.control ? this.#runEnd(cursor) : Math.min(length, cursor + 1)
                }
                this.#replaceSelection([])
                break
            case "Enter":
            case "NumpadEnter":
                this.commit()
                break
            case "Escape":
                this.cancel()
                break
            case "KeyC":
                if(event.control) this.#copy(false)
                break
            case "KeyX":
                if(event.control) this.#copy(true)
                break
            case "KeyV":
                if(event.control) this.#paste()
                break
            default:
                break
        }
    }

    /**
     * Where the run of characters ending at an index starts: the word before it, or the spaces before it
     * when a space comes just before, all of them, so `ctrl backspace` erases one or the other whole.
     */
    #runStart(index: number): number {
        if(index === 0) return 0
        const spaces = isSpace(this.#characters[index - 1])
        let start = index
        while(start > 0 && isSpace(this.#characters[start - 1]) === spaces) start--
        return start
    }

    /** Where the run of characters starting at an index ends: the word after it, or the spaces after it. */
    #runEnd(index: number): number {
        const length = this.#characters.length
        if(index === length) return length
        const spaces = isSpace(this.#characters[index])
        let end = index
        while(end < length && isSpace(this.#characters[end]) === spaces) end++
        return end
    }

    /** Does an arrow drop the selection rather than move the cursor? */
    #dropsSelection(event: UiEvent): boolean {
        return this.#hasSelection() && !event.shift
    }

    #hasSelection(): boolean {
        return this.#cursor !== this.#anchor
    }

    /** Move the cursor, extending the selection or dropping it. */
    #moveCursor(index: number, select: boolean): void {
        const clamped = Math.max(0, Math.min(this.#characters.length, index))
        if(clamped === this.#cursor && (select || !this.#hasSelection())) return
        this.#cursor = clamped
        if(!select) this.#anchor = clamped
        this.#showCursor()
    }

    /** Type a text at the cursor, over the selection, keeping only the characters accepted that fit. */
    #insert(text: string): void {
        const room = this.maxLength - this.#characters.length + (this.selectionEnd - this.selectionStart)
        const accepted = [...text].filter(character => character !== "\n" && this.accepts(character))
        if(accepted.length === 0) return
        this.#replaceSelection(accepted.slice(0, Math.max(0, room)))
    }

    #replaceSelection(characters: readonly string[]): void {
        const start = this.selectionStart
        const end = this.selectionEnd
        if(start === end && characters.length === 0) return
        this.#characters.splice(start, end - start, ...characters)
        this.#cursor = start + characters.length
        this.#anchor = this.#cursor
        this.#showCursor()
        this.onChange?.(this.text)
    }

    #copy(cut: boolean): void {
        const clipboard = this.clipboard
        if(!clipboard || !this.#hasSelection()) return
        const selected = this.#characters.slice(this.selectionStart, this.selectionEnd).join("")
        // The text cut stays cut even when the clipboard refuses it: the refusal is reported.
        clipboard.write(selected).catch(error => this.#reportClipboardFailure(error))
        if(cut) this.#replaceSelection([])
    }

    #paste(): void {
        const clipboard = this.clipboard
        if(!clipboard) return
        clipboard.read().then(
            text => {
                if(this.focused) this.#insert(text)
            },
            error => this.#reportClipboardFailure(error),
        )
    }

    #reportClipboardFailure(error: unknown): void {
        if(!this.onClipboardFailed) throw error
        this.onClipboardFailed(error)
    }

    /** Show the cursor at once after it moved or the text changed, and scroll to it. */
    #showCursor(): void {
        this.#blink = 0
        this.#cursorShown = true
        this.#keepCursorInView()
        this.invalidate()
    }

    #keepCursorInView(): void {
        const inner = this.#innerWidth()
        const cursor = this.#offsetOf(this.#cursor)
        const textWidth = this.#offsetOf(this.#characters.length)
        if(cursor - this.#scroll > inner - CURSOR_WIDTH) this.#scroll = cursor - inner + CURSOR_WIDTH
        if(cursor < this.#scroll) this.#scroll = cursor
        this.#scroll = Math.max(0, Math.min(this.#scroll, textWidth + CURSOR_WIDTH - inner))
    }

    #innerWidth(): number {
        return Math.max(0, this.bounds.width - 2 * this.theme.textInput.padding)
    }

    /** How far a boundary between characters lies from the start of the text, in virtual pixels. */
    #offsetOf(index: number): number {
        return this.#layout.widthOf(this.#characters.slice(0, index).join(""))
    }

    /** The boundary nearest a position, in pixels from the left of the field. */
    #indexAt(x: number): number {
        return this.#layout.indexAt(this.text, x - this.theme.textInput.padding + this.#scroll)
    }

    /** The first character wholly in view, and the one after the last. */
    #charactersInView(): [number, number] {
        const start = this.#scroll
        const end = this.#scroll + this.#innerWidth()
        let first = 0
        while(first < this.#characters.length && this.#offsetOf(first) < start) first++
        let last = first
        while(last < this.#characters.length && this.#offsetOf(last + 1) <= end) last++
        return [first, last]
    }

    /** The zone of the cursor, in its own coordinates, written in a rectangle. */
    #cursorRect(out: Rect): Rect {
        const padding = this.theme.textInput.padding
        const top = Math.floor((this.bounds.height - this.#layout.lineHeight) / 2)
        const x = padding - this.#scroll + this.#offsetOf(this.#cursor)
        return out.set(x, top, CURSOR_WIDTH, this.#layout.lineHeight)
    }
}

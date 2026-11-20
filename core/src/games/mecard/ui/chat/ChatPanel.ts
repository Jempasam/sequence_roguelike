import { Color } from "../../../../engine/math"
import { Box, Paragraph, Scroll, TextInput } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"
import type { Observer } from "../../sim/base/Observable"
import type { Chat } from "../../sync/chat/Chat"
import { wrapHue } from "../../sync/chat/ChatMessage"
import { DIM_INK_TEXT, DIM_TEXT, INK_TEXT, WARNING_INK_TEXT, WARNING_TEXT } from "../look/theme"

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The most characters a line holds. */
const MAX_LENGTH = 200

/** The saturation and lightness a hue is shown in, to read on a dark background. */
const HUE_SATURATION = 0.8
const HUE_LIGHTNESS = 0.7

/** What a hue (in degrees) looks like. */
export function hueColor(hue: number): Color {
    const h = wrapHue(hue) / 60
    const chroma = (1 - Math.abs(2 * HUE_LIGHTNESS - 1)) * HUE_SATURATION
    const second = chroma * (1 - Math.abs(h % 2 - 1))
    const base = HUE_LIGHTNESS - chroma / 2
    const [r, g, b] = h < 1 ? [chroma, second, 0] : h < 2 ? [second, chroma, 0] : h < 3 ? [0, chroma, second]
        : h < 4 ? [0, second, chroma] : h < 5 ? [second, 0, chroma] : [chroma, 0, second]
    return new Color(r + base, g + base, b + base)
}

/**
 * The lines of a group chat and the field to say one, to lay out where the chat is shown: a screen of its
 * own, a part of the lobby.
 *
 * @remarks
 * It shows any {@link Chat}, whoever made it and whatever session it is on: it never opens or closes one.
 * Each line is written in the color of its author.
 */
export class ChatPanel {


    /** What to lay out: the lines, the last at the foot, and the field under them. */
    public readonly root: Box

    /** The field a line is typed in. */
    public get input(): TextInput { return this.#input }

    /** The lines shown, as the text of each. */
    public get lines(): readonly string[] { return this.#lines }

    /** Is a chat shown? */
    public get showing(): boolean { return this.#chat !== null }

    constructor(
        public readonly theme: Theme,

        /** The size the lines ask for before the box they lie in changes it, in virtual pixels. */
        width: number,

        /** Is it over a light background, its text dark? */
        private readonly onLight = false,
    ){
        this.#list = new Box("column", { gap: 2, align: "stretch", padding: MARGIN })
        this.#scroll = new Scroll(theme, { width, height: 1, wheel: true })
        this.#scroll.content = this.#list
        this.#input = new TextInput(theme, { maxLength: MAX_LENGTH })
        this.#input.onCommit = text => this.#say(text)
        this.root = new Box("column", { gap: MARGIN, align: "stretch" })
        this.root.add(this.#scroll, { grow: 1 })
        this.root.add(this.#input)
    }


    /** Show a chat, in place of the one shown, with a line of information above its first line. */
    public show(chat: Chat): void {
        this.detach()
        this.#chat = chat
        this.#handles = [
            chat.heard.add(line => this.#add(`${line.author.name} : ${line.text}`, hueColor(line.author.hue))),
            chat.faulted.add(fault => this.#add(fault.describe(), WARNING_TEXT)),
        ]
        this.#add(`Tu parles en tant que ${chat.self.name}. Entrée pour envoyer.`, DIM_TEXT)
    }

    /** Stop showing the chat, the lines kept as they are. It does not dispose of the chat. */
    public detach(): void {
        for(const handle of this.#handles) handle.remove()
        this.#handles = []
        this.#chat = null
    }

    /** Forget the lines shown. */
    public clear(): void {
        for(const child of [...this.#list.children]) this.#list.remove(child)
        this.#lines.length = 0
    }

    /** Ask for another width, where the box it lies in does not set it. */
    public resize(width: number): void {
        this.#scroll.resize(width, 1)
    }


    readonly #list: Box
    readonly #scroll: Scroll
    readonly #input: TextInput
    readonly #lines: string[] = []
    #chat: Chat|null = null
    #handles: Observer[] = []

    /** Say what was typed, and empty the field. */
    #say(text: string): void {
        const line = text.trim()
        if(line === "" || !this.#chat) return
        this.#input.text = ""
        this.#chat.say(line)
    }

    /** Add a line at the foot, and scroll to it. */
    #add(text: string, color: Color): void {
        if(color === WARNING_TEXT) console.error(text)
        this.#lines.push(text)
        const shown = !this.onLight ? color : color === WARNING_TEXT ? WARNING_INK_TEXT : color === DIM_TEXT ? DIM_INK_TEXT : INK_TEXT
        this.#list.add(new Paragraph(this.theme, text, { color: shown }))
        this.#scroll.scrollToEnd()
    }
}

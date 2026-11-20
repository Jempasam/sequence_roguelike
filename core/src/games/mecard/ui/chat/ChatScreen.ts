import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel } from "../../../../engine/ui"
import type { Layer, TextInput, Theme, UiRoot } from "../../../../engine/ui"
import type { Chat } from "../../sync/chat/Chat"
import { CHOSEN_TEXT } from "../look/theme"
import { ChatPanel } from "./ChatPanel"

export { hueColor } from "./ChatPanel"

/** The color behind the chat. */
const BACKDROP = new Color(0.12, 0.11, 0.17)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** What the chat screen asks of its game. */
export interface ChatScreenHost {
    /** Leave the chat, what was shown before shown again. */
    leave(): void
}

/**
 * A group chat on screen: the lines said, the last at the foot, and a field to say one.
 *
 * @remarks
 * It shows any {@link Chat}, whoever made it and whatever session it is on: it never opens or closes one.
 * What it shows of the chat is a {@link ChatPanel}, which the lobby lays out as well.
 */
export class ChatScreen {


    /** Is the chat shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        if(visible) this.#panel.input.focus()
    }

    /** What heads the screen: the room, its code. */
    public set title(title: string){
        this.#title.text = title
    }

    /** The field a line is typed in. */
    public get input(): TextInput { return this.#panel.input }

    /** The button out of the chat. */
    public get leaveButton(): Button { return this.#leave }

    /** The lines shown, as the text of each. */
    public get lines(): readonly string[] { return this.#panel.lines }

    constructor(
        public readonly theme: Theme,

        /** The interface the chat lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: ChatScreenHost,
    ){
        this.#layer = ui.addLayer("chat")
        this.#layer.content.visible = false
        this.#title = new Label(theme, "", { color: CHOSEN_TEXT, align: "center" })
        this.#panel = new ChatPanel(theme, ui.width)
        this.#leave = new Button(theme, "Quitter")
        this.#leave.onActivate = () => host.leave()
        const backdrop = new Panel(theme, {
            background: NineSlice.flat(theme.white, BACKDROP), padding: 0, interactive: false,
        })
        this.#layer.content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        column.add(this.#title)
        column.add(this.#panel.root, { grow: 1 })
        column.add(this.#leave, { align: "center" })
        this.#layer.content.add(column, { x: "stretch", y: "stretch" })
    }


    /**
     * Show a chat, in place of the one shown, with a title, and a line of information above its first line.
     *
     * @param title - What heads the screen: the room, its code.
     */
    public show(chat: Chat, title: string): void {
        this.#title.text = title
        this.#panel.show(chat)
        this.visible = true
    }

    /** Stop showing the chat, the lines kept as they are. It does not dispose of the chat. */
    public detach(): void {
        this.#panel.detach()
    }

    /** Keep the size the interface has. */
    public frame(): void {
        this.#panel.resize(this.ui.width)
    }


    readonly #layer: Layer
    readonly #title: Label
    readonly #panel: ChatPanel
    readonly #leave: Button
}

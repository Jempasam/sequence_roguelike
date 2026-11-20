import { Color } from "../../../../engine/math"
import { Box, Label, NineSlice, Panel } from "../../../../engine/ui"
import type { Chat } from "../../sync/chat/Chat"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"
import { paperFrame } from "../look/paper"
import type { UnitSprites } from "../look/UnitSprites"
import type { ClipboardPort } from "../../../../platform"
import { ChatPanel } from "../chat/ChatPanel"
import { beigeButton, CHOSEN_TEXT } from "../look/theme"
import { ConnectionPanel } from "./ConnectionPanel"
import { HostListPanel } from "./HostListPanel"
import type { LobbyController } from "./LobbyController"
import { ModeList } from "./ModeList"

/** The color behind the lobby. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The thickness of the wooden frames around the panels, in virtual pixels. */
const WOOD_PADDING = 6

/** The title of the game, which the name of the player follows. */
const TITLE = "Dungeon of the Mecard"

/** The shares of the width of the modes, and of what lies right of them. */
const MODES_SHARE = 9
const RIGHT_SHARE = 10

/** The share of the height the connection takes, of what lies right of the modes. */
const CONNECTION_SHARE = 1 / 3

/** What the lobby screen asks of its game. */
export interface LobbyScreenHost {
    /** Leave the lobby for the menu. */
    leave(): void

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * The lobby on screen: the modes at the left, the room at the top right and the chat under it. It decides
 * nothing: what the player does is told to the {@link LobbyController}, which holds the room.
 */
export class LobbyScreen {


    /** Is the lobby shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.controller.watch(visible)
        this.#dirty = true
    }

    public get modes(): ModeList { return this.#modes }
    public get hosts(): HostListPanel { return this.#hosts }
    public get connection(): ConnectionPanel { return this.#connection }
    public get chat(): ChatPanel { return this.#chat }

    /** What heads the screen. */
    public get title(): string { return this.#title.text }

    constructor(
        public readonly theme: Theme,
        public readonly ui: UiRoot,
        public readonly controller: LobbyController,
        private readonly host: LobbyScreenHost,
        clipboard: ClipboardPort|null,
        sprites: UnitSprites|null = null,
    ){
        this.#layer = ui.addLayer("lobby")
        this.#layer.content.visible = false
        const { left, right } = this.#widths()
        this.#modes = new ModeList(theme, controller, left - 2 * WOOD_PADDING, sprites)
        this.#connection = new ConnectionPanel(theme, controller, host, clipboard, right - 2 * WOOD_PADDING)
        this.#chat = new ChatPanel(theme, right - 2 * WOOD_PADDING, true)
        this.#title = new Label(theme, TITLE, { color: CHOSEN_TEXT, align: "center" })
        const backdrop = new Panel(theme, {
            background: NineSlice.flat(theme.white, BACKDROP), padding: 0, interactive: false,
        })
        this.#layer.content.add(backdrop, { x: "stretch", y: "stretch" })
        const titlePanel = new Panel(theme, { background: null, padding: WOOD_PADDING, interactive: false })
        titlePanel.content = this.#title
        const modesPanel = this.#framed(this.#modes.root)
        const connectionPanel = this.#framed(this.#connection.root)
        this.#hosts = new HostListPanel(
            theme, controller, () => this.#connection.nameInput.text, right - 2 * WOOD_PADDING,
        )
        const chatPanel = this.#framed(this.#chat.root, true)
        this.#sidePanel = chatPanel
        const rightColumn = new Box("column", { gap: MARGIN, align: "stretch" })
        rightColumn.add(connectionPanel)
        rightColumn.add(chatPanel, { grow: 1 })
        const row = new Box("row", { gap: MARGIN, align: "stretch" })
        row.add(modesPanel)
        row.add(rightColumn, { grow: 1 })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        column.add(titlePanel)
        column.add(row, { grow: 1 })
        sprites?.whenLoaded(() => {
            const wood = sprites.wood
            if(!wood) return
            const beige = beigeButton(theme)
            titlePanel.background = beige.looks?.normal ?? null
            titlePanel.padding = WOOD_PADDING
            if(beige.textColor) this.#title.color = beige.textColor
            for(const panel of this.#woodPanels) panel.background = wood.frame
            const paper = sprites.paper
            if(paper) for(const panel of this.#paperPanels) panel.background = paperFrame(paper, 1)
            this.#dirty = true
        })
        this.#layer.content.add(column, { x: "stretch", y: "stretch" })
        controller.changed.add(() => { this.#dirty = true })
        controller.dropped.add(fault => {
            host.report(`Le lobby s'est arrêté : ${fault.describe()}`)
            this.host.leave()
        })
    }


    /** Keep the size the interface has, and build again what the room changed. */
    public frame(): void {
        const { left, right } = this.#widths()
        const height = this.ui.height - 24
        const inner = 2 * WOOD_PADDING
        this.#modes.resize(left - inner)
        this.#connection.resize(right - inner)
        this.#chat.resize(right - inner)
        const connectionHeight = Math.max(1, Math.floor(height * CONNECTION_SHARE) - inner)
        this.#connection.root.resize(right - inner, connectionHeight)
        this.#hosts.resize(right - inner, height - connectionHeight - 2 * inner - MARGIN)
        const faults = this.controller.takeFaults()
        if(faults.length > 0){
            this.#connection.notice = faults[faults.length - 1].describe()
            this.#dirty = true
        }
        this.#follow()
        if(!this.#dirty) return
        this.#dirty = false
        const name = this.controller.selfName
        this.#title.text = name === null ? TITLE : `${TITLE} - ${name}`
        this.#modes.refresh()
        this.#connection.refresh()
        // Out of a room there is no chat to show: the rooms to join take its place.
        const isListing = this.controller.phase === "disconnected"
        this.#sidePanel.content = isListing ? this.#hosts.root : this.#chat.root
        if(isListing) this.#hosts.refresh()
    }

    /** Forget what the lobby shows, as it is left. */
    public reset(): void {
        this.#shown = null
        this.#chat.detach()
        this.#chat.clear()
        this.#connection.notice = null
        this.#dirty = true
    }


    readonly #layer: Layer
    readonly #modes: ModeList
    readonly #connection: ConnectionPanel
    readonly #chat: ChatPanel
    readonly #hosts: HostListPanel
    readonly #sidePanel: Panel
    readonly #title: Label
    readonly #woodPanels: Panel[] = []
    readonly #paperPanels: Panel[] = []
    #dirty = true
    #shown: Chat|null = null

    /** A panel to put a wooden frame around a component, once the wood is loaded. */
    #framed(content: Component, onPaper = false): Panel {
        const panel = new Panel(this.theme, { background: null, padding: WOOD_PADDING, interactive: false })
        panel.content = content
        ;(onPaper ? this.#paperPanels : this.#woodPanels).push(panel)
        return panel
    }

    /** The widths of the modes, and of what lies right of them. */
    #widths(): { left: number, right: number } {
        const room = this.ui.width - 3 * MARGIN
        const left = Math.floor(room * MODES_SHARE / (MODES_SHARE + RIGHT_SHARE))
        return { left, right: room - left }
    }

    /** Show the chat of the room, or none when there is none. */
    #follow(): void {
        const chat = this.controller.chat
        if(chat === this.#shown) return
        this.#chat.detach()
        this.#shown = chat
        if(chat) this.#chat.show(chat)
        else this.#chat.clear()
    }
}

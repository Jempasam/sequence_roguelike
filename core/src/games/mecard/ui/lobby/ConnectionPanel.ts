import { Bar, Box, Button, Label, Scroll, TextInput } from "../../../../engine/ui"
import type { TextSpan, Theme } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import { cleanName, hueOfName, HOST_ID, NAME_LENGTH } from "../../sync/lobby/Profile"
import { hueColor } from "../chat/ChatPanel"
import { beigeButton, CHOSEN_TEXT, DIM_TEXT, WARNING_TEXT } from "../look/theme"
import type { LobbyController } from "./LobbyController"

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The longest code a player types. */
const CODE_LENGTH = 32

/** What the panel asks of its screen. */
export interface ConnectionHost {
    /** Leave the lobby for the menu. */
    leave(): void
}

/**
 * Where the player connects: a name, and hosting a room or joining one by its code; once in the room, the
 * code, who is there, and the way to start a game or leave.
 */
export class ConnectionPanel {


    /** What to lay out. */
    public get root(): Scroll { return this.#scroll }

    /** The field of the name the player asks for. */
    public get nameInput(): TextInput { return this.#name }

    /** The field of the code of the room to join. */
    public get codeInput(): TextInput { return this.#code }

    /** The button that opens a room, none once connected. */
    public get hostButton(): Button|null { return this.#buttons.host }

    /** The button that joins a room, none once connected. */
    public get joinButton(): Button|null { return this.#buttons.join }

    /** The button that starts or stops the game, none for a client and out of a room. */
    public get startButton(): Button|null { return this.#buttons.start }

    /** The button that leaves the room, or the lobby when there is no room. */
    public get leaveButton(): Button|null { return this.#buttons.leave }

    /** The names shown as in the room, in order, as the text of each line. */
    public get players(): readonly string[] { return this.#players }

    /** What is told of what went wrong, none when nothing did. */
    public set notice(notice: string|null){
        this.#notice = notice
    }

    public get notice(): string|null { return this.#notice }

    constructor(
        public readonly theme: Theme,
        private readonly controller: LobbyController,
        private readonly host: ConnectionHost,
        private readonly clipboard: ClipboardPort|null,
        width: number,
    ){
        this.#scroll = new Scroll(theme, { width, height: 1, wheel: true })
        this.#column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        this.#scroll.content = this.#column
        const colors = (text: string): readonly TextSpan[] => [{
            start: 0, end: [...text].length, color: hueColor(hueOfName(cleanName(text))),
        }]
        this.#name = new TextInput(theme, { maxLength: NAME_LENGTH, colors })
        this.#code = new TextInput(theme, { maxLength: CODE_LENGTH })
    }


    /** Ask for another width. */
    public resize(width: number): void {
        this.#scroll.resize(width, 1)
    }

    /**
     * Build the panel again, from where the player stands, but only when what it shows is not what it shows now:
     * a change of the lobby that is none of its business keeps its buttons, their focus and its scroll.
     */
    public refresh(): void {
        const { controller, theme } = this
        const shown: string[] = []
        if(this.#notice !== null) shown.push(this.#notice)
        const error = controller.error
        if(error && controller.phase === "disconnected") shown.push(error.describe())
        const state = JSON.stringify([
            shown, controller.phase, controller.isHost, controller.playing, controller.canRejoin,
            controller.isReconnecting, controller.code, controller.selfId,
            controller.members.map(member => [member.id, member.name, member.lost]),
        ])
        if(state === this.#state) return
        this.#state = state
        for(const child of [...this.#column.children]) this.#column.remove(child)
        this.#players = []
        this.#buttons = NO_BUTTONS
        const column = this.#column
        for(const text of shown) column.add(new Label(theme, text, { color: WARNING_TEXT }))
        // A text shown is printed to the console once, not at each build.
        const shownText = shown.join("\n")
        if(shownText !== this.#printed && shownText !== "") console.error(shownText)
        this.#printed = shownText
        if(controller.phase === "disconnected") this.#disconnected(column)
        else if(controller.phase === "connecting") this.#connecting(column)
        else this.#connected(column)
    }


    readonly #scroll: Scroll
    readonly #column: Box
    readonly #name: TextInput
    readonly #code: TextInput
    #players: string[] = []
    #notice: string|null = null
    #printed = ""
    /** What the panel was built from, to tell whether it has to be built again. */
    #state = ""
    #buttons: Buttons = NO_BUTTONS

    #disconnected(column: Box): void {
        const { theme, controller } = this
        column.add(new Label(theme, "Pseudo :", { color: DIM_TEXT }))
        column.add(this.#name)
        column.add(new Bar(1, 1, DIM_TEXT))
        column.add(new Label(theme, "Code de la room :", { color: DIM_TEXT }))
        column.add(this.#code)
        const joinButton = new Button(theme, "Se connecter", beigeButton(theme))
        joinButton.onActivate = () => controller.join(this.#code.text, this.#name.text)
        column.add(joinButton)
        const hostButton = new Button(theme, "Héberger", beigeButton(theme))
        hostButton.onActivate = () => controller.host(this.#name.text)
        column.add(hostButton)
        // Without a name, nothing to connect with.
        const sync = (): void => {
            const named = this.#name.text.trim() !== ""
            hostButton.enabled = named
            joinButton.enabled = named
        }
        this.#name.onChange = sync
        sync()
        const leave = new Button(theme, "Retour au menu", beigeButton(theme))
        leave.onActivate = () => this.host.leave()
        column.add(leave)
        this.#buttons = { ...NO_BUTTONS, host: hostButton, join: joinButton, leave }
    }

    #connecting(column: Box): void {
        const { theme, controller } = this
        column.add(new Label(theme, "Connexion...", { color: CHOSEN_TEXT }))
        const leave = new Button(theme, "Annuler", beigeButton(theme))
        leave.onActivate = () => controller.leave()
        column.add(leave)
        this.#buttons = { ...NO_BUTTONS, leave }
    }

    #connected(column: Box): void {
        const { theme, controller } = this
        if(controller.isReconnecting) column.add(new Label(theme, "Connexion perdue, reconnexion...", { color: WARNING_TEXT }))
        column.add(new Label(theme, `Code : ${controller.code ?? ""}`, { color: CHOSEN_TEXT }))
        const clipboard = this.clipboard
        if(clipboard){
            const copy = new Button(theme, "Copier le code", beigeButton(theme))
            copy.onActivate = () => void clipboard.write(controller.code ?? "").catch(() => {})
            column.add(copy)
        }
        for(const member of controller.members){
            const star = member.id === HOST_ID ? "★ " : "  "
            const text = `${star}${member.name}${member.id === controller.selfId ? " (toi)" : ""}`
            this.#players.push(text)
            const color = member.lost ? DIM_TEXT : hueColor(hueOfName(member.name))
            column.add(new Label(theme, text, { color }))
        }
        let start: Button|null = null
        if(controller.isHost){
            start = new Button(theme, controller.playing ? "Arrêter la partie" : "Lancer", beigeButton(theme))
            start.onActivate = () => {
                if(controller.playing) controller.stop()
                else controller.start()
            }
            column.add(start)
        } else if(controller.playing) column.add(new Label(theme, "Partie en cours...", { color: CHOSEN_TEXT }))
        else if(controller.canRejoin){
            column.add(new Label(theme, "Partie en cours...", { color: CHOSEN_TEXT }))
            const rejoin = new Button(theme, "Rejoindre la partie", beigeButton(theme))
            rejoin.onActivate = () => controller.rejoin()
            column.add(rejoin)
        }
        const leave = new Button(theme, "Quitter", beigeButton(theme))
        leave.onActivate = () => controller.leave()
        column.add(leave)
        this.#buttons = { ...NO_BUTTONS, start, leave }
    }
}

interface Buttons {
    readonly host: Button|null
    readonly join: Button|null
    readonly start: Button|null
    readonly leave: Button|null
}

const NO_BUTTONS: Buttons = { host: null, join: null, start: null, leave: null }

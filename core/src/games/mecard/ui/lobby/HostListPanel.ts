import { Box, Button, Label, Scroll } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"
import { beigeButton, DIM_INK_TEXT, INK_TEXT } from "../look/theme"
import type { LobbyController } from "./LobbyController"

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** What the list says when no one hosts. */
const EMPTY = "Aucune partie en ligne pour le moment."

/**
 * The rooms players host, with a button to join each: what the lobby shows in place of the chat while the
 * player is in no room.
 */
export class HostListPanel {


    /** What to lay out. */
    public get root(): Scroll { return this.#scroll }

    /** The rooms shown, in order, as the text of each line. */
    public get rows(): readonly string[] { return this.#rows }

    /** The buttons that join each room shown, in the order of {@link HostListPanel.rows}. */
    public get joinButtons(): readonly Button[] { return this.#buttons }

    constructor(
        public readonly theme: Theme,
        private readonly controller: LobbyController,

        /** The name the player asks for, as typed now. */
        private readonly nameOf: () => string,
        width: number,
    ){
        this.#scroll = new Scroll(theme, { width, height: 1, wheel: true })
        this.#column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        this.#scroll.content = this.#column
    }


    /** Ask for another size. */
    public resize(width: number, height: number): void {
        this.#scroll.resize(width, Math.max(1, height))
    }

    /** Build the list again, from the rooms the controller knows. */
    public refresh(): void {
        const { controller, theme } = this
        for(const child of [...this.#column.children]) this.#column.remove(child)
        this.#rows = []
        this.#buttons = []
        const hosts = controller.hosts
        if(hosts.length === 0){
            this.#column.add(new Label(theme, EMPTY, { color: DIM_INK_TEXT }))
            return
        }
        for(const host of hosts){
            const text = `${host.name} - ${host.code}`
            const row = new Box("row", { gap: MARGIN, align: "center" })
            row.add(new Label(theme, text, { color: INK_TEXT }), { grow: 1 })
            const join = new Button(theme, "Rejoindre", beigeButton(theme))
            join.onActivate = () => controller.join(host.code, this.nameOf())
            row.add(join)
            this.#column.add(row)
            this.#rows.push(text)
            this.#buttons.push(join)
        }
    }


    readonly #scroll: Scroll
    readonly #column: Box
    #rows: string[] = []
    #buttons: Button[] = []
}

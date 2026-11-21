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
        this.#empty = new Label(theme, EMPTY, { color: DIM_INK_TEXT })
    }


    /** Ask for another size. */
    public resize(width: number, height: number): void {
        this.#scroll.resize(width, Math.max(1, height))
    }

    /**
     * Bring the list to the rooms the controller knows: the line of a room that is still there stays as it is,
     * so the focus and the scroll stay too; only the rooms that left are taken out and the new ones added.
     */
    public refresh(): void {
        const { controller, theme } = this
        const hosts = controller.hosts
        const codes = new Set(hosts.map(host => host.code))
        // The lines stay in the order of the rooms only when the rooms that stay keep their order and the new ones
        // come last, which is how rooms appear. Anything else makes the list again.
        const kept = [...this.#lines.keys()].filter(code => codes.has(code))
        const wanted = hosts.map(host => host.code).filter(code => this.#lines.has(code))
        if(kept.some((code, index) => code !== wanted[index])) this.#clear()

        for(const [code, line] of [...this.#lines]){
            if(codes.has(code)) continue
            this.#column.remove(line.row)
            this.#lines.delete(code)
        }
        if(hosts.length === 0){
            if(!this.#empty.parent) this.#column.add(this.#empty)
        }
        else if(this.#empty.parent) this.#column.remove(this.#empty)

        for(const host of hosts){
            const text = `${host.name} - ${host.code}`
            const known = this.#lines.get(host.code)
            if(known){
                known.label.text = text
                known.join.onActivate = () => controller.join(host.code, this.nameOf())
                continue
            }
            const row = new Box("row", { gap: MARGIN, align: "center" })
            const label = new Label(theme, text, { color: INK_TEXT })
            row.add(label, { grow: 1 })
            const join = new Button(theme, "Rejoindre", beigeButton(theme))
            join.onActivate = () => controller.join(host.code, this.nameOf())
            row.add(join)
            this.#column.add(row)
            this.#lines.set(host.code, { row, label, join })
        }
        this.#rows = hosts.map(host => `${host.name} - ${host.code}`)
        this.#buttons = hosts.map(host => this.#lines.get(host.code)!.join)
    }


    readonly #scroll: Scroll
    readonly #column: Box
    readonly #empty: Label
    /** The line of each room shown, by its code. */
    readonly #lines = new Map<string, { readonly row: Box, readonly label: Label, readonly join: Button }>()
    #rows: string[] = []
    #buttons: Button[] = []

    /** Take every line out. */
    #clear(): void {
        for(const line of this.#lines.values()) this.#column.remove(line.row)
        this.#lines.clear()
    }
}

import type { Theme, UiRoot } from "../../../../engine/ui"
import type { Prompt } from "../../sim/mode/subs/choose/Picker"
import type { RosterEntry } from "../../sync/lobby/RosterMessage"
import type { UnitSprites } from "../look/UnitSprites"
import { ClickPanel } from "./ClickPanel"
import type { Cell } from "./ClickPanel"

/** How many options a column of the panel holds at most. */
const ROWS = 12

/**
 * What a player reads and clicks when a mode has it choose: the question, whose turn it is, the options in
 * columns that only the one asked may click, and what the others took so far when the mode tells it. A
 * question put to another is shown as it is, its options dim.
 */
export class PromptPanel {


    /** The texts it shows, for the tests. */
    public get texts(): readonly string[] { return this.#panel.texts }

    /** Is it shown? */
    public get visible(): boolean { return this.#panel.visible }

    public set visible(visible: boolean){
        this.#panel.visible = visible
    }

    constructor(
        theme: Theme,
        ui: UiRoot,

        /** Who is in the lobby, to write the names of the players. */
        private readonly members: () => readonly RosterEntry[],

        /** Which id is this client's. */
        private readonly me: () => string|null,

        sprites?: UnitSprites,
    ){
        this.#panel = new ClickPanel(theme, ui, { layer: "prompt", x: "center", y: "center" }, sprites)
    }


    /**
     * Show a question.
     *
     * @param picks - What each player took, by its id, when the mode tells it.
     * @param choose - Answer with an option.
     */
    public show(
        prompt: Prompt, picks: Readonly<Record<string, readonly string[]>>, choose: (option: string) => void,
    ): void {
        const nameOf = (id: string): string => this.members().find(member => member.id === id)?.name ?? id
        const mine = prompt.who === this.me()
        const title = mine ? prompt.title : `${nameOf(prompt.who)} choisit…`
        const cells: Cell[] = prompt.options.map((option): Cell => {
            return { text: option, dim: !mine, key: mine ? option : undefined }
        })
        const took = Object.entries(picks).filter(([, kits]) => kits.length > 0)
        if(took.length > 0){
            for(const [id, kits] of took) cells.push({ text: `${nameOf(id)} : ${kits.join(", ")}`, dim: true })
        }
        const columns = Math.max(1, Math.ceil(cells.length / ROWS))
        this.#panel.show({ cells, columns, title, confirm: mine }, choose)
    }

    /** Take the question off the screen. */
    public hide(): void {
        this.#panel.hide()
    }


    readonly #panel: ClickPanel
}

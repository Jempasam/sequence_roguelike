import type { Theme, UiRoot } from "../../../../engine/ui"
import type { BracketView } from "../../sim/mode/subs/tournament/Bracket"
import type { RosterEntry } from "../../sync/lobby/RosterMessage"
import type { UnitSprites } from "../look/UnitSprites"
import { ClickPanel } from "./ClickPanel"
import type { Cells } from "./ClickPanel"

/** The most a name takes of a line, in characters. */
const NAME_CHARS = 10

/** A name kept short enough for a line. */
function short(name: string): string {
    return name.length > NAME_CHARS ? `${name.slice(0, NAME_CHARS - 1)}…` : name
}

/**
 * The cells of a bracket: a title for each round, then one for each match with who plays it and who won it,
 * and a mark on those being fought, which a click may ask to watch (the key is the number of the match).
 *
 * @param nameOf - The name of a player by its id.
 */
export function bracketCells(bracket: BracketView, nameOf: (id: string) => string): Cells {
    const cells: Cells["cells"][number][] = []
    const gone = new Set(bracket.gone ?? [])
    // A player that left has no name any more: the sim tells it is gone, the screen writes what it is.
    const label = (id: string): string => gone.has(id) ? "???" : short(nameOf(id))
    bracket.rounds.forEach((round, index) => {
        const isLast = index === bracket.rounds.length - 1
        cells.push({ text: round.title })
        for(const match of round.matches){
            const first = label(match.first)
            const second = match.second === null ? "(qualifié)" : label(match.second)
            const won = match.winner === null ? "" : ` → ${label(match.winner)}`
            const fighting = isLast && match.winner === null
            const isOut = gone.has(match.first) || (match.second !== null && gone.has(match.second))
            cells.push({
                text: `${fighting ? "> " : ""}${first} - ${second}${won}`,
                dim: match.winner !== null || isOut,
                key: fighting ? String(match.id) : undefined,
            })
        }
    })
    if(bracket.champion !== null) cells.push({ text: `Vainqueur : ${label(bracket.champion)}` })
    return { cells, columns: 1 }
}

/**
 * What a player of a tournament reads over the game: the bracket as it stands, in a small panel in a corner,
 * where a click on a match being fought asks to watch it.
 */
export class BracketPanel {


    /** The lines it shows, for the tests. */
    public get lines(): readonly string[] { return this.#panel.texts }

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

        sprites?: UnitSprites,
    ){
        this.#panel = new ClickPanel(
            theme, ui, { layer: "bracket", x: "start", y: "start", offsetX: 4, offsetY: 28 }, sprites,
        )
    }


    /**
     * Show the bracket as it stands, in place of the one shown.
     *
     * @param watch - Asks to watch a match.
     */
    public show(bracket: BracketView, watch: (match: number) => void): void {
        const nameOf = (id: string): string => this.members().find(member => member.id === id)?.name ?? id
        this.#panel.show(bracketCells(bracket, nameOf), key => watch(Number(key)))
    }

    /** Take the bracket off the screen. */
    public hide(): void {
        this.#panel.hide()
    }


    readonly #panel: ClickPanel
}

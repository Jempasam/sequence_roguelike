import { Box, Label } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import type { Color } from "../../../../engine/math"
import type { Observer } from "../../sim/base/Observable"
import type { DuelFighting, DuelWatching } from "../../sync/modes/players/HubPort"
import type { DuelRacePlayer } from "../../sync/modes/players/DuelRacePlayer"
import type { RosterEntry } from "../../sync/lobby/RosterMessage"
import { hueOfName, HOST_ID } from "../../sync/lobby/Profile"
import { hueColor } from "../chat/ChatPanel"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"

/** What a line of the hud says, and the color it is written in. */
interface Line {
    readonly text: string
    readonly color: Color
}

/**
 * What a player of a race of duels reads over its run: the time left before the duels, the lives of everyone,
 * and what happens to its duel and to the race. It only shows what the player tells it.
 */
export class RaceHud {


    /** What is shown, line by line. */
    public get lines(): readonly string[] { return this.#lines.map(line => line.text) }

    /** Is it shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
    }

    constructor(
        public readonly theme: Theme,
        ui: UiRoot,

        /** Who is in the lobby, as the lobby tells it: ids and names, to write the lives of each. */
        private readonly members: () => readonly RosterEntry[],
    ){
        this.#layer = ui.addLayer("race")
        this.#layer.content.visible = false
        this.#column = new Box("column", { gap: 1, padding: 2, align: "start" })
        this.#layer.content.add(this.#column, { x: "start", y: "start", offsetX: 4, offsetY: 4 })
    }


    /** Show the race of a player, in place of the one shown. */
    public follow(player: DuelRacePlayer): void {
        this.detach()
        this.#player = player
        const { fighting, watching, duelOver } = player
        this.#observers = [
            fighting.add(duel => this.#fight(duel)),
            watching.add(duel => this.#watch(duel)),
            duelOver.add(won => this.#over(won)),
            player.won.add(id => { this.#banner = `${this.#nameOf(id)} a gagné la course !` }),
            player.finished.add(() => { this.#banner = "Personne n'a gagné la course." }),
            player.eliminated.add(() => { this.#banner = "Tu es éliminé : tu regardes la suite." }),
        ]
        this.#banner = ""
    }

    /** Stop showing the race. */
    public detach(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
        this.#player = null
        this.#banner = ""
        this.#set([])
    }

    /** Write what the race says now, laid out again only when it changed. */
    public frame(): void {
        const player = this.#player
        if(!player){
            if(this.#lines.length > 0) this.#set([])
            return
        }
        const lines: Line[] = []
        const left = player.deadline.remaining()
        if(left !== null) lines.push({ text: `Les autres arrivent : ${Math.ceil(left / 1000)} s`, color: CHOSEN_TEXT })
        if(this.#banner !== "") lines.push({ text: this.#banner, color: CHOSEN_TEXT })
        for(const member of this.members()){
            const lives = player.lives.livesOf(member.id)
            const star = member.id === HOST_ID ? "★ " : ""
            const text = lives === 0
                ? `${star}${member.name} : éliminé`
                : `${star}${member.name}${lives === null ? "" : ` : ${lives} vie${lives > 1 ? "s" : ""}`}`
            const dim = member.lost || lives === 0
            lines.push({ text, color: dim ? DIM_TEXT : hueColor(hueOfName(member.name)) })
        }
        if(lines.map(line => line.text).join("\n") !== this.#lines.map(line => line.text).join("\n")) this.#set(lines)
    }


    readonly #layer: Layer
    readonly #column: Box
    #player: DuelRacePlayer|null = null
    #observers: Observer[] = []
    #lines: readonly Line[] = []
    #banner = ""

    #set(lines: readonly Line[]): void {
        this.#lines = lines
        for(const child of [...this.#column.children]) this.#column.remove(child)
        for(const line of lines) this.#column.add(new Label(this.theme, line.text, { color: line.color }))
    }

    #nameOf(id: string): string {
        return this.members().find(member => member.id === id)?.name ?? id
    }

    #names(ids: readonly string[]): string {
        return ids.map(id => this.#nameOf(id)).join(", ")
    }

    #fight({ allies, opponents }: DuelFighting): void {
        this.#banner = `Duel : ${this.#names(allies)} contre ${this.#names(opponents)}`
    }

    #watch({ sides }: DuelWatching): void {
        this.#banner = `Tu regardes : ${sides.map(side => this.#names(side)).join(" contre ")}`
    }

    #over(won: boolean|null): void {
        if(won === null) this.#banner = "Duel terminé."
        else this.#banner = won ? "Duel gagné !" : "Duel perdu."
    }
}

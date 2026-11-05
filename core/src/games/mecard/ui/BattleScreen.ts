import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import type { Layer, Theme, UiRoot } from "../../../engine/ui"
import { concat } from "../../../semantic"
import type { Text } from "../../../semantic"
import { planFor } from "../sim/ai/Bot"
import { eventText } from "../sim/battle/events"
import { NOTE_COLOR } from "../sim/battle/previewColors"
import type { Indicator } from "../sim/battle/Action"
import type { Battle } from "../sim/battle/Battle"
import type { Team } from "../sim/battle/Team"
import type { Unit } from "../sim/battle/Unit"
import type { Card } from "../sim/card/Card"
import type { CardNode } from "../sim/card/CardNode"
import { CardChain } from "../sim/card/CardChain"
import type { RootPreview } from "../sim/card/CardChain"
import type { Hero } from "../sim/run/Hero"
import type { Reward } from "../sim/run/Run"

import { BoardView } from "./BoardView"
import { Draft } from "./Draft"
import { processText } from "./hud/ProcessView"
import { ArenaHearts } from "./hud/ArenaHearts"
import { heartText } from "./hud/HeartView"
import { Hud } from "./Hud"
import type { Controls, HudHost, Mode } from "./Hud"
import { BattleScene } from "./replay/BattleScene"
import { Replayer } from "./replay/Replayer"
import type { UnitSprites } from "./look/UnitSprites"
import { CARTE } from "../sim/base/keywords"

/** How many lines of the log are kept. */
const LOG_SIZE = 40

/** What the pointer is over that has a preview: a root of a chain, or a card of the hand. */
type Hovered =
    | { readonly unit: Unit, readonly index: number }
    | { readonly card: Card }

/** What a battle screen is shown for: who it sees as allies, and what comes once the battle is over. */
export interface BattleScreenHost {
    /** The team whose chains it sees whole, and whose units the players plan. */
    readonly viewpoint: Team

    /** How deep the run went, none when the screen does not know it. */
    readonly depth: number|null

    /** The heroes a reward may go to. */
    readonly heroes: readonly Hero[]

    /** The battle shown is over: what comes after it, a reward or a defeat, by {@link BattleScreen.end}. */
    over(battle: Battle): void

    claim(reward: Reward|null, hero: Hero|null, deck?: number): void
    restart(): void

    /**
     * A round launched elsewhere was shown to its end: a viewer loads what came meanwhile. A screen playing
     * starts the next round itself, and is never told.
     */
    replayed?(): void
}

/**
 * The phase of combat on the screen: one battle, the arena in the middle, the interface around it. Between
 * the rounds, the players put a chain together for each of their units; the bots have planned theirs, and
 * show it. Then the round is played out at once, and shown back from what the battle told, slow enough to
 * follow, before the next one starts and draws, shown the same way.
 *
 * @remarks
 * The board and the panels draw the scene, which the replay moves on, never the battle, ahead of it. Once
 * the replay is over, the scene takes the state of the battle again.
 *
 * It plays or it watches: with the `"viewer"` controls, it neither plans nor launches, and only plays the
 * rounds launched elsewhere, as they are loaded into it with {@link BattleScreen.show}. What comes before
 * and after a battle is its host's: the run, the rewards, the network.
 */
export class BattleScreen implements HudHost {


    public battle: Battle
    public mode: Mode = "planning"
    public readonly drafts = new Map<Unit, Draft>()
    public active: Unit|null = null
    public readonly log: Text[] = []
    public rewards: readonly Reward[] = []
    public warning: Text|null = null

    /** The battle as it is shown, behind the battle itself while a round plays back. */
    public readonly scene = new BattleScene()

    /** The unit the pointer is over: in the panels first, else in the arena, none when none. */
    public get highlighted(): Unit|null {
        return this.#panelUnit ?? this.#arenaUnit
    }

    public get viewpoint(): Team { return this.host.viewpoint }
    public get depth(): number|null { return this.host.depth }
    public get heroes(): readonly Hero[] { return this.host.heroes }

    constructor(
        theme: Theme,

        /** The interface the screen lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: BattleScreenHost,

        /** Does it play the units of the players, or only watch the rounds launched elsewhere? */
        public readonly controls: Controls,

        /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
        public readonly toWorld: (x: number, y: number) => readonly [number, number],

        /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
        public readonly toUi: (x: number, y: number) => readonly [number, number],

        /** The pictures of the units, drawn on the board and in the panels once loaded. */
        public readonly sprites: UnitSprites,

        battle: Battle,
    ){
        this.battle = battle
        this.#replayer = new Replayer(this.scene)
        this.#replayer.onDrained = () => this.#afterReplay()
        this.#replayer.animates = unit => {
            return controls === "player" && unit.team === this.viewpoint && unit.controller === "player"
        }
        this.#replayer.onSelect = unit => {
            this.active = unit
            this.#board.chosen = unit
            this.#hud.follow(unit)
        }
        this.#board = new BoardView(theme.font, theme.white, this.scene, sprites)
        // Made before the panels, so they lie over it.
        const arena = ui.addLayer("arena")
        this.#arenaHearts = new ArenaHearts(theme, arena, sprites, (unit, heart, over) => {
            this.hoverUnit(unit, over)
            this.#hud.showInfo(over ? heartText(heart) : null)
        }, (unit, process, over) => {
            this.hoverUnit(unit, over)
            this.#hud.showInfo(over ? processText(process) : null)
        })
        const main = ui.addLayer("main")
        this.#hud = new Hud(theme, main, this, () => ({ width: ui.width, height: ui.height }))
        this.#layers = [arena, main]
        this.show(battle)
        sprites.whenLoaded(() => this.refresh())
    }


    /** Are its panels shown? Its host hides them between the battles, and draws no frame of it then. */
    public get visible(): boolean { return this.#layers[0].content.visible }

    public set visible(visible: boolean){
        for(const layer of this.#layers) layer.content.visible = visible
    }


    /**
     * Show a battle in place of the one shown: a new one, or the same loaded again by a viewer, its round
     * planned or already launched. The log goes on, unless the battle is a new one.
     */
    public show(battle: Battle, launched = false, newBattle = true): void {
        this.battle = battle
        this.#replayer.watch(battle)
        this.#read = 0
        if(newBattle) this.log.length = 0
        this.rewards = []
        if(launched) this.#startPlaying()
        else if(battle.waiting && this.controls === "player") this.#nextRound()
        else this.#startPlanning()
    }

    /** Is a round, or a draw, being shown back? */
    public get replaying(): boolean {
        return this.mode === "playing"
    }

    /** End the battle with what comes after it: a reward to choose, or a defeat. */
    public end(mode: "reward"|"defeat", rewards: readonly Reward[] = []): void {
        this.mode = mode
        this.rewards = rewards
        this.#board.acting = null
        this.refresh()
    }

    /**
     * Advance the round, then draw the arena in the world, in the room the panels leave. The input was given
     * to the interface already, so the clicks a widget took are consumed.
     */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        // The panels are sized from the interface: a new size of the window lays them out again.
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        this.#clickArena(input)
        this.#hud.readInfo(input, this.ui.pointerX, this.ui.pointerY)
        if(this.mode === "playing") this.#replay(dt)
        this.ui.update(dt)
        this.#hud.frame(dt)
        const room = this.#hud.arenaRoom()
        const [left, top] = this.toWorld(room.left, room.top)
        const [right, bottom] = this.toWorld(room.right, room.bottom)
        this.#board.fit(this.battle, { left, top, right, bottom })
        this.#arenaHearts.place(unit => {
            const [x, y] = this.#board.heartsAnchor(unit)
            return this.toUi(x, y)
        })
        // The arena lies under the empty zones of the interface: the pointer is over it when over no widget.
        const [x, y] = this.toWorld(this.ui.pointerX, this.ui.pointerY)
        this.#arenaUnit = this.ui.hovered ? null : this.#board.unitAt(x, y)
        this.#showHighlighted()
        this.#board.draw(world, this.battle)
    }

    /** Build the panels again, from the battle as it stands. */
    public refresh(): void {
        // The widgets under the pointer are built again: what they hovered is no longer told.
        this.#hovered = null
        this.#panelUnit = null
        this.#panelHovers.clear()
        this.#board.indicators = []
        this.#hud.refresh()
        this.#arenaHearts.rebuild(this.scene)
        this.#shownVersion = this.scene.version
        this.#showHighlighted()
    }

    /** Start the chain of a unit over, when cards it may hold left the hand: it is planned again. */
    public handChanged(unit: Unit): void {
        if(this.mode !== "planning" || !this.drafts.has(unit)) return
        this.drafts.set(unit, new Draft(unit))
    }


    //// Planning ////

    public choose(unit: Unit): void {
        this.active = unit
        this.#board.chosen = unit
        this.#hud.follow(unit)
        this.warning = null
        this.refresh()
    }

    public pick(card: Card): void {
        const placement = this.#draft()?.place(card)
        this.warning = placement === "full" ? ["La chaîne est pleine : reprends une ", CARTE, " avant d'en poser une autre."]
            : placement === "lifted" ? [card, " ne tient pas seule : pose d'abord une ", CARTE, " qui la prend."]
                : null
        this.refresh()
    }

    public plug(node: CardNode, slot: number): void {
        this.#draft()?.plug(node, slot)
        this.refresh()
    }

    public remove(node: CardNode): void {
        this.#draft()?.remove(node)
        this.refresh()
    }

    public toggleUsable(index: number): void {
        this.#draft()?.toggle(index)
        this.refresh()
    }

    /** Commit every chain of the players and start the execution, unless one cannot be played. */
    public launch(): void {
        if(this.mode !== "planning" || this.controls !== "player") return
        for(const [unit, draft] of this.drafts){
            const problems = draft.chain.problems(unit.stats.chainSize.value)
            if(problems.length === 0) continue
            this.warning = [unit, " : ", problems.join(" ")]
            this.active = unit
            this.refresh()
            return
        }
        for(const [unit, draft] of this.drafts){
            this.battle.commit(unit, draft.chain)
            // The cards of a chain leave the hand as it is shown too: no event of the round tells it.
            this.scene.change(unit, shown => { shown.hand = [...unit.hand] }, false)
            this.battle.activate(unit, draft.usables)
        }
        this.battle.endPreparation()
        this.#startPlaying()
    }

    /** Show what a root of a chain would do while the pointer is over it, until it leaves. */
    public hoverRoot(unit: Unit, index: number, over: boolean): void {
        this.#hover({ unit, index }, over)
    }

    /** Highlight a unit while the pointer is over what stands for it in the panels, until it leaves. */
    public hoverUnit(unit: Unit, over: boolean): void {
        // Counted: going from the block of a unit to a chip in it, the chip may come over before the block
        // is left, and the unit stays highlighted all along.
        const count = (this.#panelHovers.get(unit) ?? 0) + (over ? 1 : -1)
        if(count > 0) this.#panelHovers.set(unit, count)
        else this.#panelHovers.delete(unit)
        this.#panelUnit = over ? unit : [...this.#panelHovers.keys()].at(-1) ?? null
        this.#showHighlighted()
    }

    /** Show what a card of the hand would do at the end of the chain while the pointer is over it. */
    public hoverCard(card: Card, over: boolean): void {
        this.#hover({ card }, over)
    }


    //// Playing and after ////

    /** Show the rest of the round at once. */
    public skip(): void {
        if(this.controls === "player") this.catchUp()
    }

    /** Show the rest of what is being shown back at once, playing or watching: a viewer running late. */
    public catchUp(): void {
        if(this.mode === "playing") this.#replayer.finish()
    }

    public claim(reward: Reward|null, hero: Hero|null, deck?: number): void {
        if(this.mode === "reward") this.host.claim(reward, hero, deck)
    }

    public restart(): void {
        this.host.restart()
    }


    readonly #board: BoardView
    readonly #hud: Hud
    readonly #arenaHearts: ArenaHearts
    readonly #replayer: Replayer

    /** The layers it lays its panels in: the hearts over the arena, then the interface. */
    readonly #layers: readonly Layer[]

    /** What the scene was at when the panels were last built, to build them again only when it changes. */
    #shownVersion = -1

    /** How many events of the battle were already read. */
    #read = 0

    /** The size of the interface the panels were laid out for, none before the first frame. */
    #size = ""

    /** What the pointer is over that has a preview, none when nothing. */
    #hovered: Hovered|null = null

    /** The unit the pointer is over in the panels, none when none. */
    #panelUnit: Unit|null = null

    /** How many things standing for each unit the pointer is over, in the panels. */
    readonly #panelHovers = new Map<Unit, number>()

    /** The unit the pointer is over in the arena, none when none. */
    #arenaUnit: Unit|null = null

    /** Select the unit a click on the arena lands on, the click no widget took. */
    #clickArena(input: InputFrame): void {
        for(const event of input.events){
            if(event.type !== "pointer-down" || event.button !== 0 || event.consumed) continue
            const [x, y] = this.toWorld(event.x / this.ui.scale, event.y / this.ui.scale)
            const unit = this.#board.unitAt(x, y)
            if(unit) this.choose(unit)
        }
    }

    /** Light up the highlighted unit everywhere it shows. */
    #showHighlighted(): void {
        this.#board.highlighted = this.highlighted
        this.#hud.highlight(this.highlighted)
    }

    #draft(): Draft|undefined {
        return this.active ? this.drafts.get(this.active) : undefined
    }

    /** Hear that the pointer came over something with a preview, or left it, then show it. */
    #hover(hovered: Hovered, over: boolean): void {
        if(over) this.#hovered = hovered
        else if(this.#hovered && sameHovered(this.#hovered, hovered)) this.#hovered = null
        else return
        this.#showHovered()
    }

    /** Say what the thing hovered does, at any time, and show what it would do during the preparation. */
    #showHovered(): void {
        const hovered = this.#hovered
        const planning = this.mode === "planning"
        if(!hovered){
            this.#board.indicators = []
            this.#hud.showInfo(null)
            return
        }
        if("card" in hovered){
            const { card } = hovered
            const preview = planning ? this.#draft()?.previewWith(this.battle, card) ?? null : null
            this.#board.indicators = indicatorsOf(preview)
            this.#hud.showInfo(concat(card, " : ", card.description))
            return
        }
        const { unit, index } = hovered
        const draft = planning ? this.drafts.get(unit) : undefined
        const shown = planning ? undefined : this.scene.of(unit)?.chain
        const plan = draft ? draft.chain : shown ? new CardChain(shown.cards) : this.battle.planOf(unit)
        // Another team sees the roots holding nested cards as hidden: they have no preview.
        const hidden = unit.team !== this.viewpoint
        const preview = !planning ? null : draft
            ? draft.previewRoot(this.battle, index)
            : plan?.preview(this.battle, unit, hidden)[index] ?? null
        this.#board.indicators = indicatorsOf(preview)
        const view = plan?.view(hidden)[index]
        if(view?.card) this.#hud.showInfo(concat(view.card, " : ", view.card.description))
    }

    /**
     * Open the preparation on the screen: playing, let the bots commit what they show, and open a draft for
     * each unit of the players; watching, show what the preparation holds.
     */
    #startPlanning(): void {
        const battle = this.battle
        this.mode = "planning"
        this.warning = null
        this.drafts.clear()
        if(this.controls === "player"){
            for(const unit of battle.initiative){
                if(unit.controller === "bot") battle.commit(unit, planFor(unit))
                else this.drafts.set(unit, new Draft(unit))
            }
        }
        this.active = [...this.drafts.keys()][0] ?? this.#sameUnit(this.active)
        this.#board.chosen = this.active
        this.#board.acting = null
        this.#readEvents()
        this.refresh()
    }

    /**
     * The unit of the battle shown that stands for one selected before, by its name: a viewer loads the
     * battle again at each round, its units new, and keeps the one it looked at. None when none.
     */
    #sameUnit(unit: Unit|null): Unit|null {
        return unit ? this.battle.units.find(other => other.name === unit.name) ?? null : null
    }

    /**
     * Show the round launched: the battle plays it out at once, then the replay shows it back. The mode is
     * set first, so whoever asks while the battle plays hears it is being shown.
     */
    #startPlaying(): void {
        this.mode = "playing"
        this.#board.chosen = null
        this.#readEvents()
        this.refresh()
        if(this.battle.executing) this.battle.playRound()
        this.#replayer.expect()
    }

    /** Start the next round, its draw shown back before the preparation opens. */
    #nextRound(): void {
        this.mode = "playing"
        this.#board.chosen = null
        this.battle.startRound()
        this.#replayer.expect()
        this.refresh()
    }

    /** Show as much of what the battle told as the time of a frame holds. */
    #replay(dt: number): void {
        const battle = this.battle
        this.#replayer.frame(dt)
        // The replay may end on this frame, and a viewer load another battle.
        if(this.battle !== battle || this.mode !== "playing") return
        this.#board.acting = this.scene.actor
        if(this.scene.version !== this.#shownVersion) this.refresh()
    }

    /**
     * Follow the end of the replay: the battle over, the next round to start, its preparation to open, or,
     * watching, what came meanwhile to load.
     */
    #afterReplay(): void {
        if(this.mode !== "playing") return
        const battle = this.battle
        this.#readEvents()
        if(battle.phase === "over") this.#finish()
        else if(battle.waiting){
            if(this.controls === "player") this.#nextRound()
            else this.host.replayed?.()
        }
        else this.#startPlanning()
    }

    #finish(): void {
        this.#board.acting = null
        this.mode = "planning"
        this.drafts.clear()
        this.refresh()
        this.host.over(this.battle)
    }

    /** Pass the new events of the battle to the log. */
    #readEvents(): void {
        const fresh = this.battle.events.slice(this.#read)
        this.#read = this.battle.events.length
        for(const event of fresh){
            const text = eventText(event)
            if(text) this.log.push(text)
        }
        this.log.splice(0, Math.max(0, this.log.length - LOG_SIZE))
    }
}

/** Do two hovered things stand for the same? */
function sameHovered(first: Hovered, second: Hovered): boolean {
    if("card" in first || "card" in second) return "card" in first && "card" in second && first.card === second.card
    return first.unit === second.unit && first.index === second.index
}

/** What a root preview draws: its indicators, and a "?" where the viewer cannot be sure. */
function indicatorsOf(root: RootPreview|null): readonly Indicator[] {
    if(!root) return []
    const doubts: Indicator[] = []
    if(!root.preview || root.uncertain) doubts.push({ kind: "label", at: root.start.position, text: "?", color: NOTE_COLOR })
    return [...doubts, ...root.preview?.indicators ?? []]
}

import type { Painter } from "../../../../engine/gpu"
import type { InputFrame } from "../../../../engine/input"
import { AnimationChain, FrameClock, instant } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Observer } from "../../sim/base/Observable"
import { eventText } from "../../sim/battle/events"
import { NOTE_COLOR } from "../../sim/battle/previewColors"
import type { Indicator } from "../../sim/battle/Action"
import type { Battle, Phase } from "../../sim/battle/Battle"
import type { Team } from "../../sim/battle/Team"
import type { Unit } from "../../sim/battle/Unit"
import type { Card } from "../../sim/card/Card"
import { CardChain } from "../../sim/card/CardChain"
import type { RootPreview } from "../../sim/card/CardChain"

import { BattleAnimations } from "./BattleAnimations"
import { BattleScene } from "./BattleScene"
import { ArenaView } from "./ArenaView"
import { BoardView } from "./BoardView"
import { Draft } from "./Draft"
import { Hud } from "./Hud"
import type { HudHost, Mode } from "./Hud"
import type { UiRect } from "../hud/BattleGrid"
import { processText } from "../hud/ProcessView"
import { ArenaHearts } from "../hud/ArenaHearts"
import { heartText } from "../hud/HeartView"
import type { UnitSprites } from "../look/UnitSprites"
import { CARTE } from "../../sim/base/keywords"

/** How many lines of the log are kept. */
const LOG_SIZE = 40

/** What the pointer is over that has a preview: a root of a chain, or a card of the hand. */
type Hovered =
    | { readonly unit: Unit, readonly index: number }
    | { readonly card: Card }

/**
 * Who starts the round: the players, from the screen; another, once the players said they are ready, the
 * screen still drawing the rounds, for a game it is the host of; another, once the players said they are
 * ready; or another, whatever the players say.
 */
export type RoundLock = "launch"|"gather"|"ready"|"waiting"

/** What the players may not do on the screen, the rest being theirs. */
export interface BattleLocks {
    /** May they not plan a unit? Asked anew at each round, the units of a battle loaded being new. */
    isLocked(unit: Unit): boolean

    readonly round: RoundLock
}

/** Nothing locked: the players play the battle. */
export const NO_BATTLE_LOCKS: BattleLocks = { isLocked: () => false, round: "launch" }

/** Everything locked: the players only watch. */
export const ALL_BATTLE_LOCKS: BattleLocks = { isLocked: () => true, round: "waiting" }

/** What a screen is built with, besides what it shows. */
export interface BattleScreenOptions {
    readonly theme: Theme

    /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
    toWorld(x: number, y: number): readonly [number, number]

    /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
    toUi(x: number, y: number): readonly [number, number]

    /** The pictures of the units, drawn on the board and in the panels once loaded. */
    readonly sprites: UnitSprites

    /** What the players may not do, nothing by default. */
    readonly locks?: BattleLocks

    /** How deep the run went. */
    depth(): number

    /** The battle shown is over, and was shown to its end. */
    over(battle: Battle): void

    /** The players said they are ready, their chains committed, for another to start the round. */
    ready?(): void

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * The phase of combat on the screen: one battle, the arena in the middle, the interface around it. Between
 * the rounds, the players put a chain together for each of their units; the bots have planned theirs, and
 * show it. Then the round is played out at once, and shown back from what the battle told, slow enough to
 * follow, before the next one starts and draws, shown the same way.
 *
 * @remarks
 * The board and the panels draw the scene, which what the screen plays moves on, never the battle, ahead of
 * it. What the battle tells goes on its {@link AnimationChain}, one thing after the other, and so does each
 * change of phase: the next one comes once the round before was shown.
 *
 * What the players may not do is told by its {@link BattleLocks}. While the round is not theirs to launch,
 * it never moves the battle on itself: another does, and it shows what it is told.
 */
export class BattleScreen implements HudHost {


    public mode: Mode = "planning"
    public readonly drafts = new Map<Unit, Draft>()
    public active: Unit|null = null
    public readonly log: Text[] = []
    public warning: Text|null = null

    /** The battle as it is shown, behind the battle itself while a round plays back. */
    public readonly scene = new BattleScene()

    /** What it plays what the battle tells on, one thing after the other. */
    public readonly animations: AnimationChain

    public readonly sprites: UnitSprites

    /** The battle shown. */
    public get engine(): Battle { return this.#engine }

    /** Show another battle in place of this one, what was going on dropped. */
    public set engine(battle: Battle){
        this.#unregisterObservers()
        this.#stopAnimations()
        this.#engine = battle
        this.#read = 0
        this.log.length = 0
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
    }

    public get battle(): Battle { return this.#engine }

    /** What the players may not do. */
    public get locks(): BattleLocks { return this.#locks }

    public set locks(locks: BattleLocks){
        this.#locks = locks
        if(this.mode === "planning") this.#openDrafts()
        this.refresh()
    }

    /** The unit the pointer is over: in the panels first, else in the arena, none when none. */
    public get highlighted(): Unit|null {
        return this.#panelUnit ?? this.#arenaUnit
    }

    /**
     * The team of the players of the battle, whose chains it sees whole: that of the first unit they plan,
     * else of the first one anyone plans.
     */
    public get viewpoint(): Team {
        const battle = this.#engine
        const planned = battle.units.filter(unit => unit.controller === "player")
        const unit = planned.find(each => !this.#locks.isLocked(each)) ?? planned[0]
        const team = unit?.team ?? battle.teams[0]
        if(!team) throw new Error("A battle with no team has no viewpoint.")
        return team
    }

    public get depth(): number { return this.options.depth() }

    /** May the players still launch the round, or say they are ready? */
    public get launchable(): boolean {
        return this.#locks.round !== "waiting" && !this.#ready
    }

    /** May the round being shown be skipped? */
    public get skippable(): boolean {
        return this.#locks.round === "launch" || this.#locks.round === "gather"
    }

    /** Does the button of the round only say the players are ready? */
    public get saysReady(): boolean {
        return this.#locks.round !== "launch"
    }

    constructor(
        /** The interface the screen lays its panels in. */
        public readonly ui: UiRoot,

        engine: Battle,

        public readonly options: BattleScreenOptions,
    ){
        const { theme, sprites } = options
        this.sprites = sprites
        this.#engine = engine
        this.#locks = options.locks ?? NO_BATTLE_LOCKS
        this.animations = new AnimationChain(error => options.report(String(error)))
        this.#battleAnimations = new BattleAnimations(this.scene, this.animations, this.#clock)
        // Not told by being ready: the players still are when the next round draws.
        this.#battleAnimations.animates = unit => {
            return !this.#locks.isLocked(unit) && unit.team === this.viewpoint && unit.controller === "player"
        }
        this.#battleAnimations.onSelect = unit => {
            this.active = unit
            this.#board.chosen = unit
            this.#hud.follow(unit)
        }
        this.#board = new BoardView(theme.font, theme.white, this.scene, sprites)
        // Made before the panels, so they lie over it, and the hearts between.
        const floor = ui.addLayer("battle-floor")
        this.#arenaView = new ArenaView(theme, this.#board, engine, sprites)
        this.#floor = floor
        const arena = ui.addLayer("battle-arena")
        this.#arenaHearts = new ArenaHearts(theme, arena, sprites, (unit, heart, over) => {
            this.hoverUnit(unit, over)
            this.#hud.showInfo(over ? heartText(heart) : null)
        }, (unit, process, over) => {
            this.hoverUnit(unit, over)
            this.#hud.showInfo(over ? processText(process) : null)
        })
        const main = ui.addLayer("battle")
        this.#hud = new Hud(theme, main, this, () => ({ width: ui.width, height: ui.height }))
        this.#layers = [floor, arena, main]
        this.#connectInputs()
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
        sprites.whenLoaded(() => this.refresh())
    }


    /** Are its panels shown? Its host hides them between the battles, and draws no frame of it then. */
    public get visible(): boolean { return this.#layers[0].content.visible }

    public set visible(visible: boolean){
        for(const layer of this.#layers) layer.content.visible = visible
    }

    /** Are the panels around the arena shown? What comes after a battle goes in their place. */
    public get panels(): boolean { return this.#layers[2].content.visible }

    public set panels(visible: boolean){
        this.#layers[2].content.visible = visible
    }

    /** May the players not plan a unit, its round being another's, or theirs being given? */
    public isLocked(unit: Unit): boolean {
        return this.#ready || this.#locks.isLocked(unit)
    }

    /** Stop showing the battle. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#stopAnimations()
    }

    /**
     * Play on what the battle told, then draw the arena in the world, in the room the panels leave. The input
     * was given to the interface already, so the clicks a widget took are consumed.
     */
    public frame(input: InputFrame, _world: Painter, dt: number): void {
        // The panels are sized from the interface: a new size of the window lays them out again.
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        this.#clickArena(input)
        this.#hud.readInfo(input, this.ui.pointerX, this.ui.pointerY)
        this.#clock.advance(dt)
        if(this.mode === "playing") this.#board.acting = this.scene.actor
        if(this.scene.version !== this.#shownVersion) this.refresh()
        this.ui.update(dt)
        this.#hud.frame(dt)
        const room = this.#placeArena()
        const { left, top } = room
        this.#board.fit(this.#engine, this.#arenaView.roomIn(room.right - left, room.bottom - top))
        this.#arenaHearts.place(unit => {
            const [x, y] = this.#board.heartsAnchor(unit)
            return [left + x, top + y] as const
        })
        // The arena takes no pointer: it is over it when over no widget.
        const { pointerX, pointerY } = this.ui
        this.#arenaUnit = this.ui.hovered ? null : this.#board.unitAt(pointerX - left, pointerY - top)
        this.#showHighlighted()
        // The board moves at every frame: the arena draws it again, from itself, being opaque.
        this.#arenaView.invalidate()
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

    /** Show the rest of what is being shown back at once. */
    public catchUp(): void {
        if(this.mode !== "playing") return
        this.#stopAnimations()
        this.animations.add(instant(() => this.#fill()))
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


    readonly #clock = new FrameClock()
    readonly #battleAnimations: BattleAnimations
    readonly #board: BoardView
    readonly #hud: Hud
    readonly #arenaHearts: ArenaHearts

    /** The layers it lays its panels in: the hearts over the arena, then the interface. */
    readonly #layers: readonly [Layer, Layer, Layer]

    /** The arena as a component, in the layer under the hearts. */
    readonly #arenaView: ArenaView
    readonly #floor: Layer

    /** Where the arena lies in the interface, as last placed. */
    #arenaRoom: UiRect|null = null

    #engine: Battle

    #locks: BattleLocks

    /** What it listens to on the battle shown. */
    #observers: Observer[] = []

    /** Did the players say they are ready, for another to launch the round? */
    #ready = false

    /** Does a battle loaded wait for what is being shown to end? */
    #loadWaiting = false

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


    //// The battle, shown ////

    /**
     * Read the whole of the battle, and open what its phase asks for.
     *
     * @param take - What takes the state to show, the battle as it is now by default.
     * @param phase - The phase of that state.
     */
    #fill(take = this.scene.capture(this.#engine), phase: Phase = this.#engine.phase): void {
        take()
        if(phase === "over") this.#finish()
        else if(phase === "draw" && this.skippable) this.#nextRound()
        else this.#startPlanning()
    }

    /** Add what the battle tells to what the screen plays, as it comes. */
    #registerObservers(): void {
        const battle = this.#engine
        this.#observers = [
            ...this.#battleAnimations.register(battle),
            battle.phaseChanged.add(phase => {
                if(phase === "execution"){
                    this.animations.add(instant(() => this.#startPlaying()))
                    return
                }
                const take = this.scene.capture(battle)
                this.animations.add(instant(() => {
                    this.#readEvents()
                    this.#fill(take, phase)
                }))
            }),
            battle.loaded.add(() => this.#showLoaded()),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Drop what waits to be played, and end what is going on. */
    #stopAnimations(): void {
        this.animations.cancel()
        this.#clock.finish()
    }

    /**
     * Show a battle loaded once what is being shown ended, as it stands now. When another load already waits,
     * the viewer is a whole preparation late: what is left is dropped.
     */
    #showLoaded(): void {
        const battle = this.#engine
        if(this.#loadWaiting) this.#stopAnimations()
        this.#loadWaiting = true
        const take = this.scene.capture(battle)
        const { phase } = battle
        this.animations.add(instant(() => {
            this.#loadWaiting = false
            this.#read = 0
            this.#fill(take, phase)
        }))
    }

    /** Tie the panels to what the players do. */
    #connectInputs(): void {
        this.#hud.actions = {
            choose: unit => this.#choose(unit),
            pick: card => this.#pick(card),
            remove: place => this.#remove(place),
            toggleUsable: index => this.#toggleUsable(index),
            launch: () => this.launch(),
            skip: () => this.#skip(),
        }
    }


    //// Planning ////

    #choose(unit: Unit): void {
        this.active = unit
        this.#board.chosen = unit
        this.#hud.follow(unit)
        this.warning = null
        this.refresh()
    }

    #pick(card: Card): void {
        const placement = this.#draft()?.place(card)
        this.warning = placement === "full" ? ["La chaîne est pleine : reprends une ", CARTE, " avant d'en poser une autre."]
            : null
        this.refresh()
    }

    #remove(place: number): void {
        this.#draft()?.remove(place)
        this.refresh()
    }

    #toggleUsable(index: number): void {
        this.#draft()?.toggle(index)
        this.refresh()
    }

    /**
     * Commit every chain of the players, unless one cannot be played. Then the round starts, or, when it is
     * another's to launch, the players wait for it.
     */
    public launch(): void {
        if(this.mode !== "planning" || !this.launchable) return
        const battle = this.#engine
        for(const [unit, draft] of this.drafts){
            const problems = draft.chain.problems(unit.stats.chainSize.value)
            if(problems.length === 0) continue
            this.#refuse(unit, [unit, " : ", problems.join(" ")])
            return
        }
        const ready = this.saysReady
        const missing = battle.awaited.units.find(unit => !this.drafts.has(unit))
        if(missing && !ready){
            this.#refuse(missing, [missing, " attend encore sa chaîne."])
            return
        }
        for(const [unit, draft] of this.drafts){
            battle.commit(unit, draft.chain)
            // The cards of a chain leave the hand as it is shown too: no event of the round tells it.
            this.scene.change(unit, shown => { shown.hand = [...unit.hand] }, false)
            battle.activate(unit, draft.usables)
        }
        if(ready){
            this.#ready = true
            this.drafts.clear()
            this.refresh()
            this.options.ready?.()
            return
        }
        battle.advance()
    }

    /** Start the round another was waiting for, every chain committed, whoever committed them. */
    public startRound(): void {
        const battle = this.#engine
        // The chains committed elsewhere left the hands shown too: no event of the round tells it.
        for(const unit of battle.initiative){
            this.scene.change(unit, shown => { shown.hand = [...unit.hand] }, false)
        }
        battle.advance()
    }

    /** Say why the round cannot start, on the unit that holds it back. */
    #refuse(unit: Unit, why: Text): void {
        this.warning = why
        this.active = unit
        this.refresh()
    }

    #skip(): void {
        if(this.skippable) this.catchUp()
    }

    /** Lay the arena over the room the panels leave, and tell where it lies. */
    #placeArena(): UiRect {
        const room = this.#hud.arenaRoom()
        const view = this.#arenaView
        const last = this.#arenaRoom
        if(!last){
            this.#floor.content.add(view, { x: "start", y: "start", offsetX: room.left, offsetY: room.top })
        } else if(last.left !== room.left || last.top !== room.top){
            this.#floor.content.setSlot(view, { offsetX: room.left, offsetY: room.top })
        }
        const width = room.right - room.left
        const height = room.bottom - room.top
        if(!last || last.right - last.left !== width || last.bottom - last.top !== height){
            view.fixedSize = { width, height }
        }
        this.#arenaRoom = room
        return room
    }

    /** Select the unit a click on the arena lands on, the click no widget took. */
    #clickArena(input: InputFrame): void {
        const room = this.#arenaRoom
        if(!room) return
        for(const event of input.events){
            if(event.type !== "pointer-down" || event.button !== 0 || event.consumed) continue
            const unit = this.#board.unitAt(event.x / this.ui.scale - room.left, event.y / this.ui.scale - room.top)
            if(unit) this.#choose(unit)
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
        const battle = this.#engine
        const planning = this.mode === "planning"
        if(!hovered){
            this.#board.indicators = []
            this.#hud.showInfo(null)
            return
        }
        if("card" in hovered){
            const { card } = hovered
            const preview = planning ? this.#draft()?.previewWith(battle, card) ?? null : null
            this.#board.indicators = indicatorsOf(preview)
            this.#hud.showInfo(concat(card, " : ", card.description))
            return
        }
        const { unit, index } = hovered
        const draft = planning ? this.drafts.get(unit) : undefined
        const shown = planning ? undefined : this.scene.of(unit)?.chain
        const plan = draft ? draft.chain : shown ? new CardChain(shown.cards) : battle.planOf(unit)
        const preview = !planning ? null : draft
            ? draft.previewRoot(battle, index)
            : plan?.preview(battle, unit)[index] ?? null
        this.#board.indicators = indicatorsOf(preview)
        const view = plan?.view()[index]
        if(view) this.#hud.showInfo(concat(view.card, " : ", view.card.description))
    }

    /** Open the preparation on the screen: a draft for each unit the players may plan. */
    #startPlanning(): void {
        this.mode = "planning"
        this.warning = null
        this.#ready = false
        this.drafts.clear()
        this.#openDrafts()
        this.active = [...this.drafts.keys()][0] ?? this.#sameUnit(this.active)
        this.#board.chosen = this.active
        this.#board.acting = null
        this.#readEvents()
        this.refresh()
    }

    /** Open a draft for each unit of the players not locked, and close those of the units locked. */
    #openDrafts(): void {
        const battle = this.#engine
        for(const unit of battle.initiative){
            if(this.isLocked(unit)) this.drafts.delete(unit)
            else if(unit.controller === "player" && !this.drafts.has(unit)) this.drafts.set(unit, new Draft(unit))
        }
    }

    /**
     * The unit of the battle shown that stands for one selected before, by its name: a battle loaded has its
     * units new, and the one looked at stays. None when none.
     */
    #sameUnit(unit: Unit|null): Unit|null {
        return unit ? this.#engine.units.find(other => other.name === unit.name) ?? null : null
    }


    //// Playing and after ////

    /** Show the round launched, which the battle played out at once. */
    #startPlaying(): void {
        this.mode = "playing"
        this.#board.chosen = null
        this.#readEvents()
        this.refresh()
    }

    /** Start the next round, its draw shown back before the preparation opens. */
    #nextRound(): void {
        this.mode = "playing"
        this.#board.chosen = null
        this.#engine.advance()
        // Its draw is shown from now on, by the units it holds: the first round has none shown before it.
        this.scene.reorder(this.#engine.initiative)
        this.refresh()
    }

    #finish(): void {
        this.#board.acting = null
        this.mode = "planning"
        this.drafts.clear()
        this.#readEvents()
        this.refresh()
        this.options.over(this.#engine)
    }

    /** Pass the new events of the battle to the log. */
    #readEvents(): void {
        const { events } = this.#engine
        const fresh = events.slice(this.#read)
        this.#read = events.length
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

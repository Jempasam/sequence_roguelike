import type { Assets } from "../../../../engine/assets"
import type { Painter } from "../../../../engine/gpu"
import type { InputFrame } from "../../../../engine/input"
import { AnimationChain, Box, Button, instant, Label, Panel } from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"
import { Scope } from "../../../../lifetime"
import type { Visual } from "../../sim/base/Visual"
import type { Battle } from "../../sim/battle/Battle"
import { BATTLE } from "../../sim/fight/fights"
import type { Run } from "../../sim/run/Run"

import { ALL_BATTLE_LOCKS, BattleScreen, NO_BATTLE_LOCKS } from "../battle/BattleScreen"
import type { BattleLocks } from "../battle/BattleScreen"
import type { UnitSprites } from "../look/UnitSprites"
import { CHOSEN_TEXT, WARNING_TEXT } from "../look/theme"
import { NO_TRAVEL_LOCKS, TravelScreen } from "../travel/TravelScreen"
import type { TravelLocks } from "../travel/TravelScreen"
import { placeColorOf } from "../travel/TravelScenes"
import { LoadingOverlay } from "./LoadingOverlay"
import { PlaceTransitions } from "./PlaceTransitions"
import type { UiSoundLink } from "../sound/UiSoundLink"
import type { ParticleContext } from "../particles/ParticleContext"
import type { RunParticleLink } from "../particles/RunParticleLink"
import { ParticleOverlay } from "../particles/ParticleOverlay"
import { BattleAmbientContext } from "../battle/BattleAmbientContext"
import type { Ambient } from "../travel/ambient/Ambient"
import type { AmbientContext } from "../travel/ambient/AmbientContext"
import { AmbientOverlay } from "../travel/ambient/AmbientOverlay"
import { TravelAmbientContext } from "../travel/ambient/TravelAmbientContext"
import { forwardAround } from "../forward/around"
import { runForwardables } from "../forward/forwardables"
import type { Forwarded } from "../forward/Forwarded"

/** What follows the run a screen shows: it is given each run the screen shows in turn. */
export interface RunFollower {
    engine: Run
}

/** The share of the screen the panel of the end of a battle takes. */
const MODAL_SHARE = 0.85

/** What the players may not do on the screen, the rest being theirs. */
export interface RunLocks {
    readonly battle: BattleLocks
    readonly travel: TravelLocks

    /** May they not move the fights on, into a fight reached or out of a battle over: it is done elsewhere? */
    readonly fights: boolean
}

/** Nothing locked: the players play the run. */
export const NO_RUN_LOCKS: RunLocks = { battle: NO_BATTLE_LOCKS, travel: NO_TRAVEL_LOCKS, fights: false }

/** Everything locked: the players only watch. */
export const ALL_RUN_LOCKS: RunLocks = { battle: ALL_BATTLE_LOCKS, travel: { map: true, halts: true }, fights: true }

/** What a screen is built with, besides what it shows. */
export interface RunScreenOptions {
    readonly theme: Theme

    /** Where the pictures of the scenes come from. */
    readonly assets: Assets

    /** The pictures of the units. */
    readonly sprites: UnitSprites

    /** What the players may not do, nothing by default. */
    readonly locks?: RunLocks

    /** What tells the speakers what the pointer does to what is no component, none when there is no sound. */
    readonly sounds?: UiSoundLink|null

    /** What is told as the animations of the run, of its journey and of its battles play, none by default. */
    readonly forwarded?: Forwarded|null

    /** What holds the particles of the run, laid over the interface by the screen, none by default. */
    readonly particles?: RunParticleLink|null

    /** What decorates the map and the arena, laid over the interface by the screen, none by default. */
    readonly ambient?: Ambient|null

    /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
    toWorld(x: number, y: number): readonly [number, number]

    /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
    toUi(x: number, y: number): readonly [number, number]

    /** Start a new run, once the party fell. */
    restart(): void

    /** The players said they are ready, their chains committed, for another to start the round. */
    ready?(): void

    /** A battle was shown to its end, whatever the locks: what shows it elsewhere leaves it then. */
    seen?(battle: Battle): void

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * A run on the screen: its journey on a {@link TravelScreen}, each fight on a {@link BattleScreen}. What a won
 * fight gives is a halt of the journey, visited over a transition out of the battle.
 *
 * @remarks
 * It holds no rule: it shows what the {@link Run} tells, and moves it on when a screen is done showing.
 */
export class RunScreen {


    /** What shows the fights. */
    public readonly battleScreen: BattleScreen

    /** What shows the journey. */
    public readonly travelScreen: TravelScreen

    /** The transitions into the places, over everything it shows. */
    public readonly transitions: PlaceTransitions

    /** The sign shown, over everything, while pictures load before a transition. */
    public readonly loading: LoadingOverlay

    /** What it plays what the run tells on, one thing after the other. */
    public readonly animations: AnimationChain

    public readonly theme: Theme

    /** The run shown. */
    public get engine(): Run { return this.#engine }

    /** Show another run in place of this one, what was going on dropped. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.animations.cancel()
        this.#engine = run
        if(this.options.particles) this.options.particles.engine = run
        for(const follower of this.#followers) follower.engine = run
        this.travelScreen.engine = run.travel
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
    }

    /** What the players may not do. */
    public get locks(): RunLocks { return this.#locks }

    public set locks(locks: RunLocks){
        this.#locks = locks
        this.battleScreen.locks = locks.battle
        this.travelScreen.locks = locks.travel
    }

    /** Is it shown? Its host hides it for what lies over the game. */
    public get visible(): boolean { return this.#visible }

    public set visible(visible: boolean){
        this.#visible = visible
        if(visible) this.#fill()
        else {
            this.battleScreen.visible = false
            this.travelScreen.visible = false
            this.#layer.content.visible = false
        }
    }

    constructor(
        /** The interface the screen lays its panels in. */
        public readonly ui: UiRoot,

        engine: Run,

        public readonly options: RunScreenOptions,
    ){
        const { theme, assets, sprites, toWorld, toUi, report } = options
        this.theme = theme
        this.#engine = engine
        this.#locks = options.locks ?? NO_RUN_LOCKS
        this.animations = new AnimationChain(error => report(String(error)))
        // The battle screen always holds a battle, for the console: the first fight of the run, until then.
        this.battleScreen = new BattleScreen(ui, engine.newBattle(), {
            theme, sprites, toWorld, toUi, report,
            sounds: options.sounds,
            forwarded: options.forwarded,
            locks: this.#locks.battle,
            depth: () => this.#engine.travel.depth,
            placeColor: () => placeColorOf(this.#engine.travel.floor.type.look.parallax),
            over: battle => this.#seeOut(battle),
            ready: () => options.ready?.(),
        })
        this.travelScreen = new TravelScreen(ui, engine.travel, {
            theme, assets, sprites, report,
            sounds: options.sounds,
            forwarded: options.forwarded,
            locks: this.#locks.travel,
            enter: visual => this.#enterVisit(visual),
            leave: () => this.transitions.leave(),
            ready: visual => this.transitions.ready(visual),
            loading: work => this.loading.during(work),
        })
        this.#layer = ui.addLayer("run")
        this.transitions = new PlaceTransitions(ui, theme, assets, report)
        // Made after the transitions, so it lies over them.
        this.loading = new LoadingOverlay(ui, theme)
        // Over everything, the tooltips apart: the ambient, then the particles of the run over it.
        if(options.ambient){
            options.ambient.contexts = this.#ambientContexts(options.ambient)
            const layer = ui.addLayer("ambient")
            layer.content.add(new AmbientOverlay(options.ambient), { x: "stretch", y: "stretch" })
        }
        if(options.particles){
            options.particles.context = this.#particleContext()
            const layer = ui.addLayer("particles")
            layer.content.add(new ParticleOverlay(options.particles), { x: "stretch", y: "stretch" })
        }
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
    }


    /**
     * Have something follow the run shown from now on, whichever it is: it is given each run the screen shows.
     *
     * @returns What stops it.
     */
    public follow(follower: RunFollower): () => void {
        follower.engine = this.#engine
        this.#followers.push(follower)
        return () => {
            const index = this.#followers.indexOf(follower)
            if(index >= 0) this.#followers.splice(index, 1)
        }
    }

    /** Go back to the map, whatever was going on left, and show it. */
    public showMap(): void {
        this.#engine.backToMap()
        this.#showTravel()
    }

    /** Stop showing the run. */
    public dispose(): void {
        this.#unregisterObservers()
        this.animations.cancel()
        this.battleScreen.dispose()
        this.travelScreen.dispose()
    }

    /** Let the screen shown play and draw: the battle, or the journey. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        if(this.#visible && this.battleScreen.visible){
            this.battleScreen.frame(input, world, dt)
            return
        }
        if(this.#visible) this.travelScreen.frame(input, world, dt)
        this.ui.update(dt)
    }

    /** The spaces the ambient decorates: the map of the journey and the arena of the battle. */
    #ambientContexts({ alpha, additive, random }: Ambient): AmbientContext[] {
        const { ui, battleScreen, travelScreen } = this
        const { sprites } = this.options
        const size = () => ({ width: ui.width, height: ui.height })
        const sprite = (visual: Visual|null) => sprites.of(visual)
        const coin = () => sprites.gold
        return [
            new TravelAmbientContext(
                alpha, additive, random, () => this.#engine.travel, travelScreen, size, sprite, coin,
            ),
            new BattleAmbientContext(
                alpha, additive, random, battleScreen, () => this.#engine.travel.floor.type,
                size, sprite, coin,
            ),
        ]
    }

    /** Where the particles start and go: the screen shown answers, the other one when it cannot. */
    #particleContext(): ParticleContext {
        const { ui, battleScreen, travelScreen } = this
        const battle = battleScreen.anchors
        const travel = travelScreen.anchors
        return {
            unitPosition: unit => battle.unitPosition(unit),
            heartsOf: unit => battle.heartsOf(unit),
            feetOf: unit => battle.feetOf(unit),
            goldCounter: () => travel.goldCounter(),
            deckPile: () => {
                const inBattle = this.#visible && battleScreen.visible
                return inBattle ? battle.deckPile() ?? travel.deckPile() : travel.deckPile() ?? battle.deckPile()
            },
            heroPortrait: hero => travel.heroPortrait(hero),
            placePosition: place => travel.placePosition(place),
            mapArea: () => travel.mapArea(),
            pointer: () => ({ x: ui.pointerX, y: ui.pointerY }),
            center: () => ({ x: ui.width / 2, y: ui.height / 2 }),
            size: () => ({ width: ui.width, height: ui.height }),
        }
    }

    /** Build what comes after a battle again, the screens under it building themselves. */
    public refresh(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        if(this.#end) content.add(this.#end(), { x: "center", y: "center" })
    }


    /** What comes after a battle is shown in, over it. */
    readonly #layer: Layer

    #engine: Run
    readonly #followers: RunFollower[] = []

    #locks: RunLocks

    #visible = true

    /** What it listens to on the run shown. */
    #observers = new Scope()

    /** What builds what comes after a battle, none when nothing does. */
    #end: (() => Component)|null = null

    /** The size of the interface it was laid out for, none before the first frame. */
    #size = ""


    //// The run, shown ////

    /** Read the whole of the run: the journey, or the battle being fought. */
    #fill(): void {
        if(!this.#visible) return
        this.#layer.content.visible = true
        const run = this.#engine
        if(run.phase === "travel") this.#showTravel()
        else {
            if(run.battle && run.battle !== this.battleScreen.engine) this.battleScreen.engine = run.battle
            this.#bringBattle()
        }
    }

    /** Add what the run tells to what the screen plays, as it comes. */
    #registerObservers(): void {
        const run = this.#engine
        const forwarded = this.options.forwarded ?? null
        this.#observers.remove()
        const journey = this.travelScreen.animations
        const forwardables = runForwardables(run).filter(observable => observable !== run.defeated)
        this.#observers = new Scope(
            run.travel.fightReached.add(() => this.#startFight()),
            // Played where the journey is shown, so a fight comes once the party walked to it.
            ...forwardAround(journey, forwarded, forwardables, () => [
                run.battleStarted.add(battle => journey.add(() => this.#enterBattle(battle))),
            ]),
            ...forwardAround(this.animations, forwarded, [run.defeated], () => [
                run.defeated.add(() => this.animations.add(instant(() => this.#showEnd(() => this.#defeat())))),
            ]),
            run.phaseChanged.add(phase => {
                if(phase === "travel") this.animations.add(() => this.#backToTravel())
            }),
            run.loaded.add(() => this.animations.add(async() => {
                await this.#battleShown()
                this.#fill()
            })),
        )
    }

    /** Wait for the battle shown to be played to the end of what it was told, at once when none is shown. */
    #battleShown(): Promise<void> {
        if(!this.#visible || !this.battleScreen.visible) return Promise.resolve()
        return this.battleScreen.animations.idle()
    }

    #unregisterObservers(): void {
        this.#observers.remove()
        this.#observers = new Scope()
    }

    /** Tie the buttons of what comes after a battle to what the players do. */
    #connectInputs(buttons: { readonly restart?: Button }): void {
        if(buttons.restart) buttons.restart.onActivate = () => this.options.restart()
    }

    /** Go into the fight reached, unless it is fought elsewhere. */
    #startFight(): void {
        const run = this.#engine
        if(!this.#locks.fights && run.canAdvance) run.advance()
    }

    /** Play the transition into a fight, its battle shown at its middle, at once when nothing is shown yet. */
    async #enterBattle(battle: Battle): Promise<void> {
        const { transition } = this.#engine.travel.fight?.type.category ?? BATTLE
        if(this.#visible) await this.transitions.enter(transition)
        if(this.#engine.battle !== battle) return
        if(this.battleScreen.engine !== battle) this.battleScreen.engine = battle
        this.#bringBattle()
    }

    /** Bring the battle shown up, over the journey. */
    #bringBattle(): void {
        if(!this.#visible) return
        this.#hideEnd()
        this.travelScreen.visible = false
        this.battleScreen.visible = true
    }

    /** Back to the map after a fight: the transition back covers the screen, the map shown at its middle. */
    async #backToTravel(): Promise<void> {
        // A won fight leads to a halt: the transition into it already took the screen over.
        if(this.#engine.travel.phase === "visit") return
        await this.#battleShown()
        if(this.#visible && !this.travelScreen.visible){
            await this.travelScreen.prepareBack()
            await this.transitions.leave()
            // Another run, or another phase, may have come meanwhile.
            if(this.#engine.phase !== "travel") return
        }
        this.#showTravel()
    }

    /** Show the map of the journey, the battle screen hidden. */
    #showTravel(): void {
        this.#hideEnd()
        if(!this.#visible) return
        this.battleScreen.visible = false
        this.travelScreen.visible = true
        this.travelScreen.showMap()
    }

    /** The battle was shown to its end: the run takes it back, unless it is fought elsewhere. */
    #seeOut(battle: Battle): void {
        const run = this.#engine
        this.options.seen?.(battle)
        if(!this.#locks.fights && run.battle === battle && run.canAdvance) run.advance()
    }

    /**
     * Play the transition into a visit, done at its middle. Into a halt that follows a battle, the battle is
     * left at the middle for the halt, so the transition goes from one to the other.
     */
    async #enterVisit(visual: Visual): Promise<void> {
        await this.#battleShown()
        await this.transitions.enter(visual)
        if(!this.#visible || !this.battleScreen.visible) return
        this.#hideEnd()
        this.battleScreen.visible = false
        this.travelScreen.visible = true
    }


    //// What comes after a battle ////

    /** Show what comes after a battle, in place of the panels around it. */
    #showEnd(build: () => Component): void {
        this.#end = build
        this.battleScreen.panels = false
        this.refresh()
    }

    #hideEnd(): void {
        if(!this.#end) return
        this.#end = null
        this.battleScreen.panels = true
        this.refresh()
    }

    #defeat(): Component {
        const { theme } = this
        const column = new Box("column", { gap: 3 })
        const told = `Les héros sont tombés à la profondeur ${this.#engine.travel.depth}.`
        column.add(new Label(theme, told, { color: WARNING_TEXT }))
        const restart = new Button(theme, this.#label("Nouvelle run"))
        this.#connectInputs({ restart })
        column.add(restart)
        return this.#modal(column)
    }

    /** A panel in the middle of the screen, most of its size. */
    #modal(content: Component): Component {
        const panel = new Panel(this.theme, { padding: 6 })
        const { width, height } = this.ui
        panel.fixedSize = { width: Math.floor(width * MODAL_SHARE), height: Math.floor(height * MODAL_SHARE) }
        panel.content = content
        return panel
    }

    #label(text: string): Label {
        return new Label(this.theme, text, { color: CHOSEN_TEXT })
    }
}

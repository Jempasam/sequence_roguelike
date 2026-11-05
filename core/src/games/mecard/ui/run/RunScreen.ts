import type { Assets } from "../../../../engine/assets"
import type { Painter } from "../../../../engine/gpu"
import type { InputFrame } from "../../../../engine/input"
import {
    AnimationChain, Box, Button, Choice, instant, Label, Panel, Scroll,
} from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"
import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import { deckShown } from "../../sim/halt/subs/shown"
import type { Hero } from "../../sim/run/Hero"
import { rewardText } from "../../sim/run/Run"
import type { Reward, Run } from "../../sim/run/Run"

import { ALL_BATTLE_LOCKS, BattleScreen, NO_BATTLE_LOCKS } from "../battle/BattleScreen"
import type { BattleLocks } from "../battle/BattleScreen"
import { cardsOption, heroOption } from "../hud/ChoiceOptions"
import type { UnitSprites } from "../look/UnitSprites"
import { CHOSEN_TEXT, WARNING_TEXT } from "../look/theme"
import { PLACE_LOOKS } from "../travel/placeLooks"
import { NO_TRAVEL_LOCKS, TravelScreen } from "../travel/TravelScreen"
import type { TravelLocks } from "../travel/TravelScreen"
import { PlaceTransitions } from "./PlaceTransitions"

/** The size the scroll of the rewards asks for: it takes whatever room its panel gives it. */
const SCROLL_SIZE = 40

/** The space between two options of the reward, and between its two steps, in virtual pixels. */
const OPTION_GAP = 6
const STEP_SPACING = 8

/** The share of the screen the panel of the end of a battle takes. */
const MODAL_SHARE = 0.85

/** What the players may not do on the screen, the rest being theirs. */
export interface RunLocks {
    readonly battle: BattleLocks
    readonly travel: TravelLocks

    /** May they not see a battle out: it ends elsewhere, and no reward is theirs to take? */
    readonly rewards: boolean
}

/** Nothing locked: the players play the run. */
export const NO_RUN_LOCKS: RunLocks = { battle: NO_BATTLE_LOCKS, travel: NO_TRAVEL_LOCKS, rewards: false }

/** Everything locked: the players only watch. */
export const ALL_RUN_LOCKS: RunLocks = { battle: ALL_BATTLE_LOCKS, travel: { map: true }, rewards: true }

/** What a screen is built with, besides what it shows. */
export interface RunScreenOptions {
    readonly theme: Theme

    /** Where the pictures of the scenes come from. */
    readonly assets: Assets

    /** The pictures of the units. */
    readonly sprites: UnitSprites

    /** What the players may not do, nothing by default. */
    readonly locks?: RunLocks

    /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
    toWorld(x: number, y: number): readonly [number, number]

    /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
    toUi(x: number, y: number): readonly [number, number]

    /** Start a new run, once the party fell. */
    restart(): void

    /** The players said they are ready, their chains committed, for another to start the round. */
    ready?(): void

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * A run on the screen: its journey on a {@link TravelScreen}, each fight on a {@link BattleScreen}, a reward
 * to choose after each victory.
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
        this.#sprites = sprites
        this.#engine = engine
        this.#locks = options.locks ?? NO_RUN_LOCKS
        this.animations = new AnimationChain(error => report(String(error)))
        // The battle screen always holds a battle, for the console: the first fight of the run, until then.
        this.battleScreen = new BattleScreen(ui, engine.newBattle(), {
            theme, sprites, toWorld, toUi, report,
            locks: this.#locks.battle,
            depth: () => this.#engine.travel.depth,
            over: battle => this.#seeOut(battle),
            ready: () => options.ready?.(),
        })
        this.travelScreen = new TravelScreen(ui, engine.travel, {
            theme, assets, sprites, report,
            locks: this.#locks.travel,
            enter: path => this.transitions.enter(path),
        })
        this.#layer = ui.addLayer("run")
        this.transitions = new PlaceTransitions(ui, assets, report)
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
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

    /** Build what comes after a battle again, the screens under it building themselves. */
    public refresh(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        if(this.#end) content.add(this.#end(), { x: "center", y: "center" })
    }


    readonly #sprites: UnitSprites

    /** What comes after a battle is shown in, over it. */
    readonly #layer: Layer

    #engine: Run

    #locks: RunLocks

    #visible = true

    /** What it listens to on the run shown. */
    #observers: Observer[] = []

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
        this.#observers = [
            run.travel.fightReached.add(() => this.#startFight()),
            // Played where the journey is shown, so a fight comes once the party walked to it.
            run.battleStarted.add(battle => {
                this.travelScreen.animations.add(() => this.#enterBattle(battle))
            }),
            run.rewardsOffered.add(rewards => {
                this.animations.add(instant(() => this.#showEnd(() => this.#reward(rewards))))
            }),
            run.defeated.add(() => this.animations.add(instant(() => this.#showEnd(() => this.#defeat())))),
            run.phaseChanged.add(phase => {
                if(phase === "travel") this.animations.add(instant(() => this.#showTravel()))
            }),
            run.loaded.add(() => this.animations.add(instant(() => this.#fill()))),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Tie the buttons of what comes after a battle to what the players do. */
    #connectInputs(buttons: { readonly skip?: Button, readonly restart?: Button }): void {
        if(buttons.skip) buttons.skip.onActivate = () => this.#claim(null, null)
        if(buttons.restart) buttons.restart.onActivate = () => this.options.restart()
    }

    /** Go into the fight reached, unless it is fought elsewhere. */
    #startFight(): void {
        const run = this.#engine
        if(!this.#locks.rewards && run.canAdvance) run.advance()
    }

    /** Play the transition into a fight, its battle shown at its middle, at once when nothing is shown yet. */
    async #enterBattle(battle: Battle): Promise<void> {
        if(this.#visible) await this.transitions.enter(PLACE_LOOKS[this.#engine.fight].transition)
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
        if(!this.#locks.rewards && run.battle === battle && run.canAdvance) run.advance()
    }

    /** Take a reward for a character, or none. */
    #claim(reward: Reward|null, hero: Hero|null, deck = 0): void {
        const run = this.#engine
        if(reward && hero) run.claim(reward, hero, hero.decks.at(deck))
        else run.skipReward()
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

    /** The reward of a victory, chosen in steps: what to take, who takes it, then a card in which deck. */
    #reward(rewards: readonly Reward[]): Component {
        const { theme } = this
        const { heroes } = this.#engine
        // A step opens under the ones before, however tall they are: the scroll goes down to it.
        const scroll = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        const choice = new Choice(theme, picks => {
            if(picks.length === 0){
                const options = rewards.map(reward => {
                    return cardsOption(theme, reward.kind === "card" ? [reward.card] : [], rewardText(reward))
                })
                return { title: this.#label("Victoire ! Choisis une récompense :"), options }
            }
            scroll.scrollToEnd()
            if(picks.length === 1){
                const options = heroes.map(hero => heroOption(theme, hero, this.#sprites))
                return { title: this.#label("Pour qui ?"), options }
            }
            const hero = heroes[picks[1]]
            if(picks.length === 2 && rewards[picks[0]].kind === "card" && hero.decks.length > 1){
                const options = hero.decks.map(deck => {
                    return cardsOption(theme, [], deckShown(hero, deck).text ?? null)
                })
                return { title: this.#label("Dans quel deck ?"), options }
            }
            return null
        }, ([reward, hero, deck]) => this.#claim(rewards[reward], heroes[hero], deck), {
            gap: OPTION_GAP, spacing: STEP_SPACING,
        })
        scroll.content = choice
        const column = new Box("column", { gap: 3 })
        column.add(scroll, { grow: 1 })
        const skip = new Button(theme, "Ne rien prendre")
        this.#connectInputs({ skip })
        column.add(skip, { align: "center" })
        return this.#modal(column)
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

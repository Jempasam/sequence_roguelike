import { AssetError } from "../../../engine/assets"
import type { Assets, LayeredImagePath } from "../../../engine/assets"
import { Console, CONSOLE_KEY, ConsoleView } from "../../../engine/console"
import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import { Transition } from "../../../engine/ui"
import type { Stack, Theme, UiRoot } from "../../../engine/ui"
import { Run } from "../sim/run/Run"
import type { Observer } from "../sim/base/Observable"
import type { Battle } from "../sim/battle/Battle"
import type { Team } from "../sim/battle/Team"
import type { Hero } from "../sim/run/Hero"
import type { PlaceKind } from "../sim/run/Journey"
import type { Reward } from "../sim/run/Run"
import { BattleBroadcaster } from "../sync/BattleBroadcaster"
import { BATTLE_TOPIC, TRAVEL_TOPIC } from "../sync/SyncChannel"
import type { SyncSender } from "../sync/SyncChannel"
import { TravelBroadcaster } from "../sync/TravelBroadcaster"

import { BattleScreen } from "./BattleScreen"
import type { BattleScreenHost } from "./BattleScreen"
import { LiveContext, registerCommands } from "./commands"
import type { MecardContext, MecardHost } from "./commands"
import { UnitSprites } from "./look/UnitSprites"
import { PnjScreen } from "./pnj/PnjScreen"
import { ArmScreen } from "./travel/ArmScreen"
import { PLACE_LOOKS } from "./travel/placeLooks"
import { TravelScreen } from "./travel/TravelScreen"
import type { TravelHost } from "./travel/TravelScreen"

/** The share of the height of the screen the console takes, from the top. */
const CONSOLE_SHARE = 0.45

/** How long the transition entering a place takes, in seconds. */
const ENTER_DURATION = 1.5

/**
 * Dungeon of the Mecard, played: a run down the journey of each floor, its map on a {@link TravelScreen},
 * each fight on a {@link BattleScreen}, a reward to choose after each victory, back to the start after a
 * defeat. The console lies over it all.
 *
 * @remarks
 * It holds no rule: it shows what the {@link Run} tells, and calls it when a screen is done showing.
 *
 * Given a channel to viewers, it sends them each battle through a {@link BattleBroadcaster} and the journey
 * through a {@link TravelBroadcaster}, which only read them: nothing of the game knows it is watched.
 */
export class MecardGame implements BattleScreenHost, TravelHost {


    public run: Run

    public get battle(): Battle { return this.#screen.battle }
    public get viewpoint(): Team { return this.run.heroesTeam }
    public get depth(): number { return this.run.travel.depth }
    public get heroes(): readonly Hero[] { return this.run.heroes }

    constructor(
        theme: Theme,

        /** The interface the game lays its panels in. */
        public readonly ui: UiRoot,

        /** Where the pictures of the journey come from. */
        assets: Assets,

        /** The seed of the first run. */
        seed: number,

        /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
        toWorld: (x: number, y: number) => readonly [number, number],

        /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
        toUi: (x: number, y: number) => readonly [number, number],

        /** Where the battles and the journey go to their viewers, none when nobody watches. */
        viewers: SyncSender|null = null,
    ){
        this.#seed = seed
        this.#broadcaster = viewers ? new BattleBroadcaster(BATTLE_TOPIC.sender(viewers)) : null
        this.#travelBroadcaster = viewers ? new TravelBroadcaster(TRAVEL_TOPIC.sender(viewers)) : null
        this.run = this.#newRun()
        // The battle screen always holds a battle, for the console: the first fight of the run, until then.
        const battle = this.run.newBattle()
        const sprites = new UnitSprites()
        this.#screen = new BattleScreen(theme, ui, this, "player", toWorld, toUi, sprites, battle)
        this.#travel = new TravelScreen(theme, ui, this, assets, sprites)
        void sprites.load(ui.gpu, assets).catch((error: unknown) => {
            if(!(error instanceof AssetError)) throw error
            this.#console.print(`Les sprites des unités n'ont pas pu être chargés : ${error.message}`)
        })
        this.#pnj = new PnjScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#travelOn(),
        }, assets)
        this.#arm = new ArmScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#travelOn(),
        }, assets)
        const actions: Omit<MecardHost, "run"|"battle"> = {
            print: text => this.#console.print(text),
            refresh: () => {
                this.#screen.refresh()
                if(this.#travel.visible) this.#travel.refresh()
            },
            handChanged: unit => this.#screen.handChanged(unit),
            newBattle: () => this.#newBattle(),
            restart: () => this.restart(),
            go: place => {
                this.#travelOn()
                this.#travel.go(place)
            },
            showMap: () => this.#travelOn(),
            visit: kind => {
                this.#travelOn()
                this.run.travel.visit(kind)
            },
            showPnj: () => this.#pnjOn(),
            showArm: () => this.#armOn(),
            playTransition: (path, duration, reverse) => {
                void this.#playTransition(path, duration, reverse)
            },
        }
        const host = (): MecardHost => ({ ...actions, run: this.run, battle: this.battle })
        this.#console = new Console<MecardContext>(new LiveContext(host))
        registerCommands(this.#console)
        this.#console.print("Console : tape help pour la liste des commandes.")
        this.#transitions = ui.addLayer("transition").content
        this.#assets = assets
        // Loaded now, so the first place entered does not wait for its transition.
        for(const path of new Set(Object.values(PLACE_LOOKS).map(look => look.transition))){
            void this.#transitionOf(path)
        }
        this.#consoleView = new ConsoleView(theme, this.#console)
        this.#consoleView.visible = false
        ui.addLayer("console").content.add(this.#consoleView, { x: "start", y: "start", offsetX: 4, offsetY: 4 })
        this.#follow(this.run)
        this.#travelOn()
    }


    /** Read the input, then let the screen shown play and draw: the battle, or the journey. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        this.#consoleView.resize(this.ui.width - 8, Math.floor(this.ui.height * CONSOLE_SHARE))
        this.ui.handle(input)
        this.#openConsole(input)
        if(this.#screen.visible) this.#screen.frame(input, world, dt)
        else {
            if(this.#pnj.visible) this.#pnj.frame()
            else if(this.#arm.visible) this.#arm.frame()
            else this.#travel.frame(input, dt)
            this.ui.update(dt)
        }
    }

    /** Play the transition of a kind of place over the screen, the party arriving behind it at its middle. */
    public enter(kind: PlaceKind, arrive: () => void): void {
        void this.#transitionOf(PLACE_LOOKS[kind].transition).then(transition => {
            if(transition) transition.play({ duration: ENTER_DURATION, onMiddle: arrive })
            else arrive()
        })
    }

    /** Print what went wrong in the console. */
    public report(text: string): void {
        this.#console.print(text)
    }

    /** The battle was shown to its end: the run takes it back. */
    public over(): void {
        this.run.endBattle()
    }

    /** Take a reward for a character, or none. */
    public claim(reward: Reward|null, hero: Hero|null, deck = 0): void {
        if(reward && hero) this.run.claim(reward, hero, hero.decks.at(deck))
        else this.run.skipReward()
    }

    /** Start a new run from the start of its journey. */
    public restart(): void {
        this.run.backToMap()
        this.#seed++
        this.run = this.#newRun()
        this.#follow(this.run)
        this.#travelOn()
    }


    readonly #screen: BattleScreen
    readonly #travel: TravelScreen
    readonly #pnj: PnjScreen
    readonly #arm: ArmScreen
    readonly #broadcaster: BattleBroadcaster|null
    readonly #travelBroadcaster: TravelBroadcaster|null
    readonly #console: Console<MecardContext>
    readonly #consoleView: ConsoleView<MecardContext>
    readonly #assets: Assets

    /** What the transitions are shown in, over the screens and under the console. */
    readonly #transitions: Stack

    /** The transitions, by their painting, as they load: none for one that could not. */
    readonly #transitionsByPath = new Map<LayeredImagePath, Promise<Transition|null>>()

    #seed: number

    /** What it listens to on the run. */
    #observers: Observer[] = []

    /** A run of the current seed, the errors of what listens to it told in the console. */
    #newRun(): Run {
        return new Run(this.#seed, error => {
            this.#console.print(error instanceof Error ? error.message : String(error))
        })
    }

    /** Show what a run tells, in place of the one followed. */
    #follow(run: Run): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = [
            run.travel.fightReached.add(() => run.startBattle()),
            run.battleStarted.add(battle => this.#showBattle(battle)),
            run.rewardsOffered.add(rewards => this.#screen.end("reward", rewards)),
            run.defeated.add(() => this.#screen.end("defeat")),
            run.phaseChanged.add(phase => {
                if(phase === "travel") this.#showTravel()
            }),
        ]
        this.#travel.follow(run.travel)
        this.#travelBroadcaster?.follow(run.travel)
    }

    /** Open the console when its key was pressed and nothing took the press: open, the console takes it. */
    #openConsole(input: InputFrame): void {
        const pressed = input.events.some(event => {
            return event.type === "key-down" && event.code === CONSOLE_KEY && !event.consumed
        })
        if(pressed) this.#consoleView.open()
    }

    /** Fight the place the party stands on again, whatever was going on left. */
    #newBattle(): void {
        this.run.backToMap()
        this.run.startBattle()
    }

    #showBattle(battle: Battle): void {
        this.#broadcaster?.follow(battle)
        this.#travel.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#screen.visible = true
        this.#screen.show(battle)
    }

    /** Go back to the map, whatever was going on left, and show it. */
    #travelOn(): void {
        this.run.backToMap()
        this.#showTravel()
    }

    /** Show the map of the journey, the battle screen hidden. */
    #showTravel(): void {
        this.#screen.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#travel.visible = true
        this.#travel.showMap()
    }

    /** Show the bench of the characters alone, the run left where it stands. */
    #pnjOn(): void {
        this.#screen.visible = false
        this.#travel.visible = false
        this.#arm.visible = false
        this.#pnj.visible = true
    }

    /** Show the bench of the forearm alone, the run left where it stands. */
    #armOn(): void {
        this.#screen.visible = false
        this.#travel.visible = false
        this.#pnj.visible = false
        this.#arm.visible = true
    }

    /** Play a transition over whatever is shown, telling its middle and its end. */
    async #playTransition(path: LayeredImagePath, duration: number, reverse: boolean): Promise<void> {
        const transition = await this.#transitionOf(path)
        transition?.play({
            duration,
            reverse,
            onMiddle: () => this.#console.print("Transition : milieu."),
            onEnd: () => this.#console.print("Transition : fin."),
        })
    }

    /** A transition, loaded the first time it is asked for and laid in its layer, none when it cannot be. */
    #transitionOf(path: LayeredImagePath): Promise<Transition|null> {
        let loading = this.#transitionsByPath.get(path)
        if(!loading){
            loading = this.#loadTransition(path)
            this.#transitionsByPath.set(path, loading)
        }
        return loading
    }

    async #loadTransition(path: LayeredImagePath): Promise<Transition|null> {
        try {
            const transition = Transition.fromImage(this.ui.gpu, await this.#assets.layeredImage(path), path)
            this.#transitions.add(transition, { x: "stretch", y: "stretch" })
            return transition
        } catch(error){
            if(!(error instanceof Error)) throw error
            this.#console.print(`La transition ${path} n'a pas pu être chargée : ${error.message}`)
            return null
        }
    }
}

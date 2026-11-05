import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import { Label } from "../../../engine/ui"
import type { Theme, UiRoot } from "../../../engine/ui"
import type { Observer } from "../sim/base/Observable"
import type { Battle } from "../sim/battle/Battle"
import type { Team } from "../sim/battle/Team"
import type { Hero } from "../sim/run/Hero"
import { Run } from "../sim/run/Run"
import type { Travel } from "../sim/travel/Travel"
import { BattleReceiver } from "../sync/BattleReceiver"
import { BATTLE_TOPIC, TRAVEL_TOPIC } from "../sync/SyncChannel"
import type { SyncSource } from "../sync/SyncChannel"
import { TravelReceiver } from "../sync/TravelReceiver"

import { AssetError } from "../../../engine/assets"
import type { Assets } from "../../../engine/assets"

import { BattleScreen } from "./BattleScreen"
import { UnitSprites } from "./look/UnitSprites"
import type { BattleScreenHost } from "./BattleScreen"
import { DIM_TEXT, WARNING_TEXT } from "./look/theme"
import { TravelScreen } from "./travel/TravelScreen"
import type { TravelHost } from "./travel/TravelScreen"

/** What the viewer says before the first battle comes. */
const WAITING = "En attente d'une partie à regarder..."

/**
 * Dungeon of the Mecard, watched: the run played on another client, as it comes. Each battle comes through a
 * {@link BattleReceiver}, shown on a {@link BattleScreen} that only watches, which plays the rounds itself
 * from the chains the other client committed. The journey between them comes through a
 * {@link TravelReceiver}, shown on a {@link TravelScreen} that only watches.
 *
 * @remarks
 * What came waits for what is being shown to end, a round or a walk, whichever it is, so a viewer sees each
 * to its end. The screen shown is the one of what came last: a battle stays shown once over, until the party
 * is back on the map.
 */
export class MecardViewer implements BattleScreenHost, TravelHost {


    public readonly depth = null
    public readonly heroes: readonly Hero[] = []

    /** The run of the journey watched, an empty one before the first comes, for the screen to hold one. */
    public get run(): Run {
        return this.#travelReceiver.travel?.run ?? this.#noRun
    }

    /** The team of the players of the battle watched, whose chains it sees whole: the first one there. */
    public get viewpoint(): Team {
        const battle = this.#watched
        const team = battle?.units.find(unit => unit.controller === "player")?.team ?? battle?.teams[0]
        if(!team) throw new Error("A viewer reads its viewpoint once a battle is shown.")
        return team
    }

    constructor(
        private readonly theme: Theme,

        /** The interface the viewer lays its panels in. */
        public readonly ui: UiRoot,

        /** Where the battles and the journey come from. */
        source: SyncSource,

        /** Where the pictures of the units and of the journey come from. */
        assets: Assets,

        /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
        private readonly toWorld: (x: number, y: number) => readonly [number, number],

        /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
        private readonly toUi: (x: number, y: number) => readonly [number, number],
    ){
        void this.#sprites.load(ui.gpu, assets).catch((error: unknown) => {
            if(!(error instanceof AssetError)) throw error
            this.#warn(`Les sprites des unités n'ont pas pu être chargés : ${error.message}`)
        })
        const fail = (error: unknown): void => {
            this.#warn(error instanceof Error ? error.message : String(error))
        }
        const showing = (): boolean => (this.#screen?.replaying ?? false) || !this.#travelScreen.drained
        this.#receiver = new BattleReceiver(BATTLE_TOPIC.source(source))
        this.#receiver.onLoad = (battle, { kind, newBattle }) => this.#show(battle, kind === "launch", newBattle)
        this.#receiver.onDesync = ({ round }) => this.#warn(`Désynchronisé au round ${round} : rattrapé.`)
        this.#receiver.onError = fail
        this.#receiver.holding = showing
        this.#receiver.onLate = () => this.#screen?.catchUp()
        this.#travelReceiver = new TravelReceiver(TRAVEL_TOPIC.source(source))
        this.#travelReceiver.onLoad = travel => this.#showJourney(travel)
        this.#travelReceiver.onDesync = () => this.#warn("Désynchronisé sur la carte : rattrapé.")
        this.#travelReceiver.onError = fail
        this.#travelReceiver.holding = showing
        // Made once the journey can be read, and before the waiting line, so what goes wrong is told over it.
        this.#travelScreen = new TravelScreen(theme, ui, this, assets, this.#sprites, true)
        this.#travelScreen.visible = false
        this.#waiting = new Label(theme, WAITING, { color: DIM_TEXT })
        ui.addLayer("waiting").content.add(this.#waiting, { x: "center", y: "center" })
    }


    /** Read the input, take in what came, then let the screen shown play and draw, once something came. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        this.ui.handle(input)
        // The journey first: a move came before the battle it leads to.
        this.#travelReceiver.release()
        this.#receiver.release()
        if(this.#screen?.visible) this.#screen.frame(input, world, dt)
        else {
            if(this.#travelScreen.visible) this.#travelScreen.frame(input, dt)
            this.ui.update(dt)
        }
    }

    /** The battle watched is over: the viewer stays on it, until the party is back on the map. */
    public over(): void {}

    /** A viewer chooses no reward. */
    public claim(): void {}

    /** A viewer starts no run. */
    public restart(): void {}

    /** The round watched was shown to its end: what came meanwhile is loaded. */
    public replayed(): void {
        this.#receiver.release()
    }

    /** A viewer enters no place: the party only stands where it is told. */
    public enter(_: unknown, arrive: () => void): void {
        arrive()
    }

    /** Say what went wrong. */
    public report(text: string): void {
        this.#warn(text)
    }

    /** Stop listening for the run. */
    public dispose(): void {
        this.#receiver.dispose()
        this.#travelReceiver.dispose()
    }


    readonly #receiver: BattleReceiver
    readonly #travelReceiver: TravelReceiver
    readonly #sprites = new UnitSprites()
    readonly #waiting: Label
    readonly #travelScreen: TravelScreen
    readonly #noRun = new Run(0)
    #screen: BattleScreen|null = null

    /** The battle watched, known before its screen is built, since building it reads the viewpoint. */
    #watched: Battle|null = null

    /** What tells that the party of the journey watched moved. */
    #moves: Observer|null = null

    #show(battle: Battle, launched: boolean, newBattle: boolean): void {
        this.#waiting.visible = false
        this.#travelScreen.visible = false
        this.#watched = battle
        if(this.#screen){
            this.#screen.visible = true
            this.#screen.show(battle, launched, newBattle)
        } else {
            this.#screen = new BattleScreen(
                this.theme, this.ui, this, "viewer", this.toWorld, this.toUi, this.#sprites, battle,
            )
        }
        if(launched && this.#screen.mode !== "playing") this.#screen.show(battle, true, false)
    }

    /** Show a journey loaded in place of the one before, the party standing where it is. */
    #showJourney(travel: Travel): void {
        this.#moves?.remove()
        this.#moves = travel.moved.add(() => this.#showMap())
        this.#travelScreen.follow(travel)
        this.#showMap()
        this.#travelScreen.showMap()
    }

    /** Bring the map up, over the battle that ended: what it was playing goes on. */
    #showMap(): void {
        this.#waiting.visible = false
        if(this.#screen) this.#screen.visible = false
        if(this.#travelScreen.visible) return
        this.#travelScreen.visible = true
        this.#travelScreen.refresh()
    }

    /** Say what went wrong where the waiting line is, over the journey. */
    #warn(text: string): void {
        this.#waiting.text = text
        this.#waiting.color = WARNING_TEXT
        this.#waiting.visible = true
    }
}

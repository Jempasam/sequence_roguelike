import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import type { SaveOptions } from "../../sim/save/battleSave"

import { BattleBroadcaster } from "../battle/BattleBroadcaster"
import { BATTLE_TOPIC, RUN_TOPIC, TRAVEL_TOPIC } from "../SyncChannel"
import type { SyncSender } from "../SyncChannel"
import { TravelBroadcaster } from "../travel/TravelBroadcaster"
import { writeRunMessage } from "./RunMessage"

/**
 * The main client of a run, telling its viewers: it sends the run as it stands whenever a halt or a fight is
 * left, and each battle as it starts, and has a {@link TravelBroadcaster} and a {@link BattleBroadcaster}
 * tell the journey and the rounds, each on its topic.
 *
 * @remarks
 * A viewer connecting hears the run first, then the battle being fought, then what the two others tell.
 */
export class RunBroadcaster {


    /** The run told. */
    public get engine(): Run { return this.#engine }

    /** Tell another run in place of this one, sent at once. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.#follow(run)
        this.#travel.engine = run.travel
        this.#battle.engine = null
    }

    constructor(
        engine: Run,

        /** The channel to the viewers, each part of the run taking its topic on it. */
        sender: SyncSender,

        /** How the battles are written down: their draw piles hidden, or not. */
        options: SaveOptions = {},
    ){
        this.#sender = RUN_TOPIC.sender(sender)
        this.#peers = [
            this.#sender.onPeer(() => this.#initialMessage()),
            this.#sender.onPeer(() => this.#lastBattle),
        ]
        this.#engine = engine
        this.#follow(engine)
        this.#travel = new TravelBroadcaster(engine.travel, TRAVEL_TOPIC.sender(sender))
        this.#battle = new BattleBroadcaster(null, BATTLE_TOPIC.sender(sender), options)
    }


    /** Stop telling the run. */
    public dispose(): void {
        this.#unregisterObservers()
        for(const peers of this.#peers) peers.dispose()
        this.#travel.dispose()
        this.#battle.dispose()
    }


    readonly #sender: SyncSender
    readonly #peers: readonly { dispose(): void }[]
    readonly #travel: TravelBroadcaster
    readonly #battle: BattleBroadcaster

    #engine: Run

    /** Which run is told, from 1. */
    #number = 0

    /** How many messages of the run were sent. */
    #sequence = 0

    /** The run as it last stood, none before the first. */
    #lastSave: string|null = null

    /** The battle being fought as it started, none out of one. */
    #lastBattle: string|null = null

    #observers: Observer[] = []

    #follow(run: Run): void {
        this.#engine = run
        this.#number++
        this.#sequence = 0
        this.#lastBattle = null
        this.#registerObservers()
        this.#sendSave()
    }

    #registerObservers(): void {
        const run = this.#engine
        this.#observers = [
            run.battleStarted.add(battle => this.#sendBattle(battle)),
            run.travel.visitEnded.add(() => this.#sendSave()),
            run.phaseChanged.add(phase => {
                if(phase !== "travel") return
                this.#lastBattle = null
                this.#battle.engine = null
                // A party still entering a place is not back: the map comes later.
                if(run.travel.phase === "map") this.#sendSave()
            }),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** What a viewer connecting starts from. */
    #initialMessage(): string|null {
        return this.#lastSave
    }

    #sendSave(): void {
        this.#sequence++
        this.#lastSave = writeRunMessage({
            kind: "save", number: this.#number, sequence: this.#sequence, save: this.#engine.save(),
        })
        this.#sender.send(this.#lastSave)
    }

    /** Tell a battle that starts, then its rounds. */
    #sendBattle(battle: Battle): void {
        this.#sequence++
        this.#lastBattle = writeRunMessage({
            kind: "battle", number: this.#number, sequence: this.#sequence,
            save: battle.save(this.#battle.options),
        })
        this.#sender.send(this.#lastBattle)
        this.#battle.engine = battle
    }
}

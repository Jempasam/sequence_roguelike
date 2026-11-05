import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { SaveOptions } from "../../sim/save/battleSave"

import type { SyncSender } from "../SyncChannel"
import { writeBattleMessage } from "./BattleMessage"
import type { BattleMessageKind } from "./BattleMessage"

/**
 * The main client of a battle, telling its viewers: it sends the battle at the start of each preparation and
 * at its end. It reads the battle through its observers only, so the battle knows nothing of it.
 */
export class BattleBroadcaster {


    /** The battle told, none between two. */
    public get engine(): Battle|null { return this.#engine }

    /** Tell another battle in place of this one: sent at once when its preparation started. */
    public set engine(battle: Battle|null){
        this.#unregisterObservers()
        this.#engine = battle
        this.#lastSent = null
        this.#sequence = 0
        if(!battle) return
        this.#number++
        this.#registerObservers(battle)
        if(battle.phase === "preparation" && battle.round > 0) this.#sendSave(battle)
    }

    constructor(
        engine: Battle|null,

        public readonly sender: SyncSender,

        /** How the battle is written down: its draw piles hidden, or not. */
        public readonly options: SaveOptions = {},
    ){
        this.#peers = sender.onPeer(() => this.#initialMessage())
        this.engine = engine
    }


    /** Stop telling the battle. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#peers.dispose()
    }


    #engine: Battle|null = null

    /** Which battle is told, from 1. */
    #number = 0

    /** How many messages of the battle were sent. */
    #sequence = 0

    /** The last message of the battle, none before the first. */
    #lastSent: string|null = null

    readonly #peers: { dispose(): void }

    #observers: Observer[] = []

    #registerObservers(battle: Battle): void {
        this.#observers = [
            battle.phaseChanged.add(phase => {
                if(phase === "preparation") this.#sendSave(battle)
            }),
            battle.preparationEnding.add(() => this.#send("launch", battle)),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** What a viewer connecting starts from. */
    #initialMessage(): string|null {
        return this.#lastSent
    }

    #sendSave(battle: Battle): void {
        this.#send("save", battle)
    }

    #send(kind: BattleMessageKind, battle: Battle): void {
        this.#sequence++
        this.#lastSent = writeBattleMessage({
            kind, number: this.#number, sequence: this.#sequence, secret: this.options.secret ?? false,
            save: battle.save(this.options),
        })
        this.sender.send(this.#lastSent)
    }
}

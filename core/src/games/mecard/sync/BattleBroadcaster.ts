import { saveBattle } from "../sim/save/battleSave"
import type { Observer } from "../sim/base/Observable"
import type { Battle } from "../sim/battle/Battle"
import type { SaveOptions } from "../sim/save/battleSave"

import { BATTLE_TOPIC } from "./SyncChannel"
import type { SyncSender } from "./SyncChannel"
import { writeMessage } from "./SyncMessage"
import type { SyncKind } from "./SyncMessage"

/**
 * The main client of a battle, telling its viewers: it follows the battles one after the other, and sends
 * each at the start of its preparation and at its end. It reads the battle through its observers only, so
 * the battle knows nothing of it.
 */
export class BattleBroadcaster {


    constructor(
        public readonly sender: SyncSender,

        /** How the battle is written down: its draw piles hidden, or not. */
        public readonly options: SaveOptions = {},
    ){}


    /**
     * Follow a new battle in place of the one before: sent at once when its preparation started, then at
     * each preparation and at each end of one.
     */
    public follow(battle: Battle): void {
        this.#stopFollowing()
        this.#battle++
        this.#sequence = 0
        this.#observers.push(
            battle.phaseChanged.add(phase => {
                if(phase === "preparation") this.#send("preparation", battle)
            }),
            battle.preparationEnding.add(() => this.#send("launch", battle)),
        )
        if(battle.phase === "preparation" && battle.round > 0) this.#send("preparation", battle)
    }

    /** Stop following the battle. */
    public dispose(): void {
        this.#stopFollowing()
    }


    /** Which battle is followed, from 1. */
    #battle = 0

    /** How many messages of the battle were sent. */
    #sequence = 0

    readonly #observers: Observer[] = []

    #stopFollowing(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }

    #send(kind: SyncKind, battle: Battle): void {
        this.#sequence++
        this.sender.send(writeMessage({
            kind, battle: this.#battle, sequence: this.#sequence, secret: this.options.secret ?? false,
            save: saveBattle(battle, this.options),
        }), BATTLE_TOPIC.name)
    }
}

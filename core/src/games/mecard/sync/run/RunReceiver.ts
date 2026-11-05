import type { Run } from "../../sim/run/Run"

import { BattleReceiver } from "../battle/BattleReceiver"
import { BATTLE_TOPIC, RUN_TOPIC, TRAVEL_TOPIC } from "../SyncChannel"
import type { SyncSource } from "../SyncChannel"
import { TravelReceiver } from "../travel/TravelReceiver"
import { readRunMessage } from "./RunMessage"
import type { RunMessage, RunRest } from "./RunMessage"

/**
 * A viewer of a run played elsewhere: it loads each save of the run into its own, joins each battle that
 * starts, and has a {@link TravelReceiver} and a {@link BattleReceiver} take in the journey and the rounds,
 * each from its topic.
 */
export class RunReceiver {


    /** What takes in the journey. */
    public readonly travel: TravelReceiver

    /** What takes in the rounds of the battle being fought. */
    public get battle(): BattleReceiver {
        if(!this.#battle) throw new Error("A viewer takes the rounds in once it listens.")
        return this.#battle
    }

    /** The run watched. */
    public get engine(): Run { return this.#engine }

    /** Watch another run in place of this one. */
    public set engine(run: Run){
        this.#engine = run
        this.travel.engine = run.travel
        this.#watch()
    }

    /**
     * What hears that a message of any part of the run could not be read or taken in. A failure nobody hears
     * is thrown, so it is never silent.
     */
    public get onError(): ((error: unknown) => void)|null { return this.#onError }

    public set onError(onError: ((error: unknown) => void)|null){
        this.#onError = onError
        this.travel.onError = onError
        this.battle.onError = onError
    }

    constructor(engine: Run, source: SyncSource){
        this.#engine = engine
        this.travel = new TravelReceiver(engine.travel, TRAVEL_TOPIC.source(source))
        // The rounds last: a viewer connecting must have joined the battle before it hears them.
        this.#listening = RUN_TOPIC.source(source).listen(text => this.receive(text))
        this.#battle = new BattleReceiver(engine.battle, BATTLE_TOPIC.source(source))
    }


    /** Take a message in. */
    public receive(text: string): void {
        try {
            const message = readRunMessage(text)
            if(this.#isStale(message)) return
            this.#heard = { number: message.number, sequence: message.sequence }
            if(message.kind === "save") this.#applySave(message)
            else this.#engine.joinBattle(message.save)
            this.#watch()
        } catch(error){
            this.#fail(error)
        }
    }

    /** Stop listening, and leave the run watched as it is. */
    public dispose(): void {
        this.#listening.dispose()
        this.travel.dispose()
        this.battle.dispose()
    }


    #engine: Run

    readonly #listening: { dispose(): void }

    /** What takes the rounds in, none until it listens. */
    #battle: BattleReceiver|null = null

    #onError: ((error: unknown) => void)|null = null

    /** The run and the message last heard, none before the first. */
    #heard: { readonly number: number, readonly sequence: number }|null = null

    /** Is a message older than the last heard? */
    #isStale(message: RunMessage): boolean {
        const heard = this.#heard
        if(!heard) return false
        if(message.number !== heard.number) return message.number < heard.number
        return message.sequence <= heard.sequence
    }

    #applySave(message: RunRest): void {
        this.#engine.load(message.save)
    }

    /** Take the rounds in for the battle being fought, none out of one. */
    #watch(): void {
        if(this.#battle) this.#battle.engine = this.#engine.battle
    }

    #fail(error: unknown): void {
        if(!this.#onError) throw error
        this.#onError(error)
    }
}

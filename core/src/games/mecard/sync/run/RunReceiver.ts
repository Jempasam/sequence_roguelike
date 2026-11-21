import type { Run } from "../../sim/run/Run"

import { Fault } from "../../../../engine/net/Fault"
import { BattleReceiver } from "../battle/BattleReceiver"
import { BATTLE_TOPIC, RUN_TOPIC, TRAVEL_TOPIC } from "../SyncChannel"
import type { SyncSource } from "../SyncChannel"
import { forward, signal, UnloadableFault } from "../faults"
import { detailOf } from "../read"
import { TravelReceiver } from "../travel/TravelReceiver"
import { readRunMessage } from "./RunMessage"
import type { RunMessage, RunRest } from "./RunMessage"
import type { Removable } from "../../../../lifetime"

/**
 * A viewer of a run played elsewhere: it loads each save of the run into its own, joins each battle that
 * starts, and has a {@link TravelReceiver} and a {@link BattleReceiver} take in the journey and the rounds,
 * each from its topic.
 */
export class RunReceiver {


    /** What takes in the journey. */
    public readonly travel: TravelReceiver

    /**
     * What takes in the rounds of the battle being fought. It is made inside the constructor, before the
     * first message of the run can be heard, which a channel may replay at once.
     */
    public get battle(): BattleReceiver {
        return this.#battle as BattleReceiver
    }

    /** The run watched. */
    public get engine(): Run { return this.#engine }

    /** Watch another run in place of this one. */
    public set engine(run: Run){
        this.#engine = run
        this.travel.engine = run.travel
        this.#watch()
    }

    /** Told of a message of any part of the run that could not be read or taken in: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(engine: Run, source: SyncSource){
        this.#engine = engine
        this.travel = new TravelReceiver(engine.travel, TRAVEL_TOPIC.source(source))
        this.#forwarding = [forward(this.travel, this, false)]
        // The rounds last: a viewer connecting must have joined the battle before it hears them.
        this.#listening = RUN_TOPIC.source(source).listen(text => this.receive(text))
        this.#battle = new BattleReceiver(engine.battle, BATTLE_TOPIC.source(source))
        this.#forwarding.push(forward(this.#battle, this, false))
    }


    /** Take a message in. */
    public receive(text: string): void {
        const message = readRunMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        try {
            if(this.#isStale(message)) return
            this.#heard = { number: message.number, sequence: message.sequence }
            if(message.kind === "save") this.#applySave(message)
            else this.#engine.joinBattle(message.save)
            this.#watch()
        } catch(error){
            this.faulted.notify(new UnloadableFault(RUN_TOPIC.name, detailOf(error)))
        }
    }

    /** Stop listening, and leave the run watched as it is. */
    public dispose(): void {
        this.#listening.remove()
        for(const handle of this.#forwarding) handle.remove()
        this.travel.dispose()
        this.battle.dispose()
    }


    #engine: Run

    readonly #listening: Removable

    /** What takes the rounds in, none until it listens. */
    #battle: BattleReceiver|null = null

    #forwarding: Removable[] = []

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
}

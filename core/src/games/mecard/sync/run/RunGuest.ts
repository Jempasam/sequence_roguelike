import type { Observer } from "../../sim/base/Observable"
import type { Run } from "../../sim/run/Run"

import { BattleGuest } from "../battle/BattleGuest"
import { Fault } from "../../../../engine/net/Fault"
import { JOIN_TOPIC, PLAN_TOPIC, SEAT_TOPIC } from "../SyncChannel"
import type { SyncLink } from "../SyncChannel"
import { forward, signal } from "../faults"
import { readSeatMessage } from "./SeatMessage"

/**
 * A client that came to play a run hosted elsewhere: it says so, hears what it plays, and has a
 * {@link BattleGuest} give the host its plans.
 *
 * @remarks
 * It only speaks for its units: the run itself comes through a RunReceiver, as to any viewer. It plays what
 * the host says, and watches as long as the host gives it nothing.
 */
export class RunGuest {


    /** The units it plays, by their names. */
    public get units(): readonly string[] { return this.#units }

    /** The run played. */
    public get engine(): Run { return this.#engine }

    /** Play another run in place of this one. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.#engine = run
        this.#registerObservers()
        this.#follow()
    }

    /** Told of a message that could not be read, or a plan that could not be given: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(
        engine: Run,

        /** The way to the host. */
        link: SyncLink,

        /** Told what it plays, each time it changes. */
        public readonly seated: (units: readonly string[]) => void,
    ){
        this.#engine = engine
        this.#battle = new BattleGuest(engine.battle, PLAN_TOPIC.link(link), () => this.#units)
        this.#forwarding = forward(this.#battle, this, false)
        this.#registerObservers()
        this.#listening = SEAT_TOPIC.link(link).listen(text => this.receive(text))
        JOIN_TOPIC.link(link).send("")
    }


    /** Take a message in. */
    public receive(text: string): void {
        const message = readSeatMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        this.#units = message.units
        this.seated(this.#units)
    }

    /** Give the host what was committed for its units: the client is ready. */
    public ready(): void {
        this.#battle.ready()
    }

    /** Stop playing, and leave the run as it is. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#forwarding.dispose()
        this.#listening.dispose()
    }


    readonly #forwarding: { dispose(): void }
    readonly #battle: BattleGuest
    readonly #listening: { dispose(): void }

    #engine: Run

    #units: readonly string[] = []

    #observers: Observer[] = []

    #registerObservers(): void {
        const run = this.#engine
        this.#observers = [
            run.battleStarted.add(() => this.#follow()),
            run.loaded.add(() => this.#follow()),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Play the battle being fought, none out of one. */
    #follow(): void {
        this.#battle.engine = this.#engine.battle
    }
}

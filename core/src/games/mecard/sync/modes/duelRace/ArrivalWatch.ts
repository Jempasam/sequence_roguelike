import type { Observer } from "../../../sim/base/Observable"

import type { Deadline } from "../../Deadline"
import { signal } from "../../faults"
import type { Progress } from "../../progress/ProgressMessage"

/**
 * What the hub reads the progress of the players with, to run a round of arrivals: the first player to reach
 * the duels starts the one time limit of the round, and the round is on when everyone is there.
 *
 * @remarks
 * It keeps what each player last told, once it reached the hub: the last progress heard is the truth. The
 * players still in are asked of the hub each time, so one that is out is never waited for. A time limit that
 * comes names each player not there yet as late, and the round goes on once they are.
 */
export class ArrivalWatch {


    /** Told once a round, with how long the others have, when the first player arrives. */
    public readonly started = signal<number>()

    /** Told of each player that arrived, the first time this round. */
    public readonly arrived = signal<string>()

    /** Told of each player not there when the time limit comes. */
    public readonly late = signal<string>()

    /** Told once a round, when every player still in is there. */
    public readonly allArrived = signal<void>()

    constructor(
        private readonly deadline: Deadline,

        /** How long the others have once the first arrived, in milliseconds. */
        private readonly arrivalMs: number,

        /** The players still in. */
        private readonly alive: () => readonly string[],
    ){
        this.#expiry = deadline.expired.add(() => this.#expire())
    }


    /** Did the first player of the round arrive, so the others are being waited for? */
    public get isStarted(): boolean { return this.#isStarted }

    /** Is a player there, by the last progress heard of it? */
    public isThere(id: string): boolean {
        return this.#there.get(id) === true
    }

    /** Hear where a player stands: what it told of itself is what the hub holds. */
    public hear(id: string, progress: Progress): void {
        if(!this.alive().includes(id)) return
        const was = this.#there.get(id) === true
        this.#there.set(id, progress.atDuel)
        if(progress.atDuel && !was){
            this.arrived.notify(id)
            if(!this.#isStarted){
                this.#isStarted = true
                this.deadline.start(this.arrivalMs)
                this.started.notify(this.arrivalMs)
            }
        }
        this.check()
    }

    /** Look again whether everyone is there: a player left, or was put out. */
    public check(): void {
        if(!this.#isStarted || this.#isDone) return
        const alive = this.alive()
        if(alive.length === 0 || !alive.every(id => this.isThere(id))) return
        this.#isDone = true
        this.deadline.cancel()
        this.allArrived.notify()
    }

    /**
     * The round could not be made with the players there: it is waited for again, to be told once more when
     * everyone is there, as it will be when a lane is taken or one is out.
     */
    public reopen(): void {
        this.#isDone = false
    }

    /** Begin the next round: nobody is there, and no time runs. */
    public reset(): void {
        this.#there.clear()
        this.#isStarted = false
        this.#isDone = false
        this.deadline.cancel()
    }

    /** Stop. */
    public dispose(): void {
        this.#expiry.remove()
    }


    readonly #expiry: Observer
    readonly #there = new Map<string, boolean>()
    #isStarted = false
    #isDone = false

    #expire(): void {
        if(!this.#isStarted || this.#isDone) return
        for(const id of this.alive()) if(!this.isThere(id)) this.late.notify(id)
    }
}

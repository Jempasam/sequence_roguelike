import type { Observer } from "../../sim/base/Observable"
import { DUEL_HALT } from "../../sim/halt/subs/duel/DuelHalt"
import type { Travel } from "../../sim/travel/Travel"

import { writeProgressMessage } from "./ProgressMessage"
import type { Progress } from "./ProgressMessage"

/** Where the snapshots of a journey go: the hub, which tells the others, however it is reached. */
export interface ProgressSink {
    /** Tell where a journey stands. */
    send(progress: Progress): void
}

/**
 * What tells where a journey stands: a snapshot of it is sent whenever it changes, to whoever the link leads
 * to. It reads the journey through its observers only, so the journey knows nothing of it.
 *
 * @remarks
 * What is sent is a state, never an event: whoever hears it last has the truth, and the one that comes
 * after a connection was lost is told by {@link ProgressBroadcaster.resend}.
 */
export class ProgressBroadcaster {


    constructor(
        private readonly travel: Travel,

        private readonly sink: ProgressSink,
    ){
        this.#observers = [
            travel.moved.add(() => this.#send()),
            travel.phaseChanged.add(() => this.#send()),
            travel.floorEntered.add(() => this.#send()),
            travel.loaded.add(() => this.#send()),
        ]
        this.#send()
    }


    /** Where the journey stands now. */
    public snapshot(): Progress {
        const { travel } = this
        return {
            floor: travel.floor.level,
            depth: travel.depth,
            layer: travel.place?.layer ?? -1,
            atDuel: travel.phase === "visit" && travel.halt?.type === DUEL_HALT,
            inBattle: travel.phase === "fight",
            inHalt: travel.phase === "visit",
        }
    }

    /** Say that the party waits at the duels, whatever the journey says: it has none ahead to be sent to. */
    public forceAtDuel(): void {
        const progress = { ...this.snapshot(), atDuel: true }
        this.#last = writeProgressMessage(progress)
        this.sink.send(progress)
    }

    /** Tell where the journey stands again, as the host may have missed it. */
    public resend(): void {
        this.#last = null
        this.#send()
    }

    /** Stop telling. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
    }


    readonly #observers: readonly Observer[]
    #last: string|null = null

    #send(): void {
        const progress = this.snapshot()
        const text = writeProgressMessage(progress)
        if(text === this.#last) return
        this.#last = text
        this.sink.send(progress)
    }
}

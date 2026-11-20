import type { Fault } from "../../../../../engine/net/Fault"
import { DUEL_HALT, DuelHalt } from "../../../sim/halt/subs/duel/DuelHalt"
import type { Run } from "../../../sim/run/Run"

import { NoDuelAheadFault, signal, UnloadableFault } from "../../faults"
import { detailOf } from "../../read"

/**
 * A player's run as the race of duels moves it: sent to the halt of the duels when it is late, and let go
 * when the duels are over. It only calls what a run already does.
 */
export class Contestant {


    /** Told once the party was sent to the halt of the duels. */
    public readonly kicked = signal<void>()

    /** Told once the party was let go from the halt of the duels. */
    public readonly resumed = signal<void>()

    /** Told of what was dealt with: no duels ahead, or a move the journey refused. */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly run: Run,

        /** Told when there is no halt of the duels ahead: the player is then counted as arrived anyway. */
        private readonly arrivedAnyway: () => void,
    ){}


    /** The halt of the duels the party waits at, none when it waits at none. */
    public get waitingAt(): DuelHalt|null {
        const halt = this.run.travel.halt
        return halt instanceof DuelHalt && halt.locked ? halt : null
    }

    /**
     * Send the party to the next halt of the duels, whatever it was doing: its fight or its visit is left,
     * and it is taken there. A party already waiting at one is left as it is.
     */
    public kick(): void {
        if(this.waitingAt) return
        const { travel } = this.run
        try {
            // A party on its way into a place has left nothing yet: it enters first, to have one to leave.
            if(travel.canAdvance) travel.advance()
            const target = travel.nextPlaceOf(DUEL_HALT)
            this.run.backToMap()
            if(!target){
                this.faulted.notify(new NoDuelAheadFault())
                this.arrivedAnyway()
                return
            }
            travel.jump(target)
            // The halt is made on the place, so the party may go back into it, which a jump does not do.
            travel.haltOf(target)
            travel.go(target)
            travel.enter()
        } catch(error){
            this.faulted.notify(new UnloadableFault("kick", detailOf(error)))
            return
        }
        this.kicked.notify()
    }

    /** Let the party go from the halt of the duels it waits at, when it waits at one. */
    public resume(): void {
        const halt = this.waitingAt
        if(!halt) return
        halt.release()
        this.resumed.notify()
    }
}

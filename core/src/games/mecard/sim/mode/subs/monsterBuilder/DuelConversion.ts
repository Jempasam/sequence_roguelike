import type { Observer } from "../../../base/Observable"
import type { HaltType } from "../../../halt/HaltType"
import { DUEL_HALT, DuelHalt } from "../../../halt/subs/duel/DuelHalt"
import type { Place } from "../../../run/Journey"
import type { Run } from "../../../run/Run"

/**
 * What turns every fight on the map of a hero into a duel: each place holding a fight holds the halt of the
 * duels instead, on the floor the party is on and on each floor it enters. The halt that paid for the
 * fight is kept, to pay for the duel when it is won.
 *
 * @remarks
 * It changes places of the journey as a mode may, and knows nothing of who the party duels with: the run
 * itself goes on as it did, a place less to fight in.
 */
export class DuelConversion {


    constructor(private readonly run: Run){
        this.#observers = [run.travel.floorEntered.add(() => this.convert())]
        this.convert()
    }


    /** Turn the fights of the map as it is now into duels. Places already turned are left as they are. */
    public convert(): void {
        const { travel } = this.run
        let changed = false
        for(const place of travel.journey.places){
            if(!place.fight) continue
            this.#rewards.set(place, place.halt)
            const mutable = place as { fight: Place["fight"], halt: Place["halt"] }
            mutable.fight = null
            mutable.halt = DUEL_HALT
            changed = true
        }
        if(changed) travel.mapDrawn.notify(travel.journey)
    }

    /**
     * The party won its duel: the halt that paid for the fight it replaced pays for it, in the visit it is
     * in. Does nothing when the party is in no halt of the duels.
     */
    public win(): void {
        const { travel } = this.run
        const { place, halt } = travel
        if(!place || !(halt instanceof DuelHalt)) return
        const reward: HaltType|null = this.#rewards.get(place) ?? null
        halt.win(reward ? reward.create(this.run) : null)
    }

    /** Stop converting. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
    }


    readonly #observers: readonly Observer[]

    /** The halt that paid for the fight of each place turned into a duel, none when it paid with none. */
    readonly #rewards = new Map<Place, HaltType|null>()
}

import type { Place } from "../../sim/run/Journey"
import type { Travel } from "../../sim/travel/Travel"

/** The party on its way to a place. */
export interface PartyWalk {
    readonly to: Place

    /** How far it went, from 0 where it leaves to 1 where it arrives. */
    share: number
}

/**
 * Where the map shows the party: the replay of a journey moves it, behind the travel, which has it where it
 * goes at once. It is held apart from the map, which a screen may build again at any time.
 */
export class ShownParty {


    /** The place it stands on, or leaves, none before the first of the floor. */
    public here: Place|null = null

    /** Its way to a place, none while it stands. */
    public walk: PartyWalk|null = null

    /** Start going to a place. */
    public leave(to: Place): void {
        this.walk = { to, share: 0 }
    }

    /** Stand on the place it was going to. */
    public land(): void {
        if(this.walk) this.here = this.walk.to
        this.walk = null
    }

    /** Take where a travel has it. */
    public resync(travel: Travel): void {
        this.here = travel.place
        this.walk = null
    }
}

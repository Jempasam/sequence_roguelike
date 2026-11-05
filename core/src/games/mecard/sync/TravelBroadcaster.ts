import type { Observer } from "../sim/base/Observable"
import type { Place } from "../sim/run/Journey"
import { saveRun } from "../sim/save/runSave"
import type { PlaceMove, Travel } from "../sim/travel/Travel"

import { TRAVEL_TOPIC } from "./SyncChannel"
import type { SyncSender } from "./SyncChannel"
import { writeTravelMessage } from "./TravelMessage"

/**
 * The main client of a journey, telling its viewers: it follows the journey of each run, and sends each move
 * of the party, and the run as it stands whenever a halt or a fight is left. It reads the journey and its run
 * through their observers only, so they know nothing of it.
 *
 * @remarks
 * What stands is kept for a viewer to come, a move is not: the viewer takes the next one from where it is
 * told the party stands.
 */
export class TravelBroadcaster {


    constructor(
        public readonly sender: SyncSender,
    ){}


    /**
     * Follow a new journey in place of the one before: sent at once, then at each move, and each time the
     * party is back on the map, from a halt or a fight.
     */
    public follow(travel: Travel): void {
        this.#stopFollowing()
        this.#journey++
        this.#sequence = 0
        this.#observers.push(
            travel.moved.add(move => this.#sendMove(travel, move)),
            travel.visitEnded.add(() => this.#sendRest(travel)),
            travel.run.phaseChanged.add(phase => {
                // A party still entering a place is not back: the map comes later.
                if(phase === "travel" && travel.phase === "map") this.#sendRest(travel)
            }),
        )
        this.#sendRest(travel)
    }

    /** Stop following the journey. */
    public dispose(): void {
        this.#stopFollowing()
    }


    /** Which journey is followed, from 1. */
    #journey = 0

    /** How many messages of the journey were sent. */
    #sequence = 0

    readonly #observers: Observer[] = []

    #stopFollowing(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }

    #sendMove(travel: Travel, { from, to }: PlaceMove): void {
        const rank = (place: Place): number => travel.journey.places.indexOf(place)
        this.#sequence++
        this.sender.send(writeTravelMessage({
            kind: "moved", journey: this.#journey, sequence: this.#sequence,
            from: from && rank(from), to: rank(to), depth: travel.depth,
        }))
    }

    #sendRest(travel: Travel): void {
        this.#sequence++
        this.sender.send(writeTravelMessage({
            kind: "state", journey: this.#journey, sequence: this.#sequence, save: saveRun(travel.run),
        }), TRAVEL_TOPIC.name)
    }
}

import type { Observer } from "../../sim/base/Observable"
import type { Place } from "../../sim/run/Journey"
import type { PlaceMove, Travel } from "../../sim/travel/Travel"

import type { SyncSender } from "../SyncChannel"
import { writeTravelMessage } from "./TravelMessage"

/**
 * The main client of a journey, telling its viewers: it sends each move of the party, and the journey as it
 * stands whenever a halt is left. It reads the journey through its observers only, so it knows nothing of it.
 *
 * @remarks
 * A viewer connecting hears what stands last, not the moves since: it takes the next one from there.
 */
export class TravelBroadcaster {


    /** The journey told. */
    public get engine(): Travel { return this.#engine }

    /** Tell another journey in place of this one, sent at once. */
    public set engine(travel: Travel){
        this.#unregisterObservers()
        this.#follow(travel)
    }

    constructor(
        engine: Travel,

        public readonly sender: SyncSender,
    ){
        this.#peers = sender.onPeer(() => this.#initialMessage())
        this.#engine = engine
        this.#follow(engine)
    }


    /** Stop telling the journey. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#peers.dispose()
    }


    #engine: Travel

    /** Which journey is told, from 1. */
    #number = 0

    /** How many messages of the journey were sent. */
    #sequence = 0

    /** The journey as it last stood, none before the first. */
    #lastSave: string|null = null

    readonly #peers: { dispose(): void }

    #observers: Observer[] = []

    #follow(travel: Travel): void {
        this.#engine = travel
        this.#number++
        this.#sequence = 0
        this.#registerObservers()
        this.#sendSave()
    }

    #registerObservers(): void {
        const travel = this.#engine
        this.#observers = [
            travel.moved.add(move => this.#sendMove(move)),
            travel.visitEnded.add(() => this.#sendSave()),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** What a viewer connecting starts from. */
    #initialMessage(): string|null {
        return this.#lastSave
    }

    #sendMove({ from, to }: PlaceMove): void {
        const travel = this.#engine
        const rank = (place: Place): number => travel.journey.places.indexOf(place)
        this.#sequence++
        this.sender.send(writeTravelMessage({
            kind: "moved", number: this.#number, sequence: this.#sequence,
            from: from && rank(from), to: rank(to), depth: travel.depth,
        }))
    }

    #sendSave(): void {
        this.#sequence++
        this.#lastSave = writeTravelMessage({
            kind: "save", number: this.#number, sequence: this.#sequence, save: this.#engine.save(),
        })
        this.sender.send(this.#lastSave)
    }
}

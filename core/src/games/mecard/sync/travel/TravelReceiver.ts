import { placeAt } from "../../sim/save/travelSave"
import type { Travel } from "../../sim/travel/Travel"

import type { SyncSource } from "../SyncChannel"
import { readTravelMessage } from "./TravelMessage"
import type { TravelMessage, TravelMove, TravelRest } from "./TravelMessage"

/** A viewer the party was told to stand elsewhere than where its moves had it: one of them was lost. */
export interface TravelDesync {
    /** Which journey, and which message of it told. */
    readonly number: number
    readonly sequence: number
}

/**
 * A viewer of a journey played elsewhere: it loads each save the main client sends into its journey, and
 * moves the party on its own map in between, which its {@link Travel} tells as the journey played would.
 *
 * @remarks
 * What comes is taken in at once: whatever shows the journey plays it at its own pace, behind it.
 */
export class TravelReceiver {


    /** The journey watched. */
    public engine: Travel

    /** What hears that a move was lost, nothing when none. */
    public onDesync: ((desync: TravelDesync) => void)|null = null

    /**
     * What hears that a message could not be read or taken in. A failure nobody hears is thrown, so it is
     * never silent.
     */
    public onError: ((error: unknown) => void)|null = null

    constructor(engine: Travel, source: SyncSource){
        this.engine = engine
        this.#listening = source.listen(text => this.receive(text))
    }


    /** Take a message in. */
    public receive(text: string): void {
        try {
            const message = readTravelMessage(text)
            if(this.#isStale(message)) return
            this.#heard = { number: message.number, sequence: message.sequence }
            if(message.kind === "save") this.#applySave(message)
            else this.#move(message)
        } catch(error){
            this.#fail(error)
        }
    }

    /** Stop listening, and leave the journey watched as it is. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }

    /** The journey and the message last heard, none before the first. */
    #heard: { readonly number: number, readonly sequence: number }|null = null

    /** The journey a save came for, none before the first: a move of another has no map to go on. */
    #standing: number|null = null

    /** Is a message older than the last heard, or a move with no map, which joining late may bring? */
    #isStale(message: TravelMessage): boolean {
        if(message.kind === "moved" && message.number !== this.#standing) return true
        const heard = this.#heard
        if(!heard) return false
        if(message.number !== heard.number) return message.number < heard.number
        return message.sequence <= heard.sequence
    }

    #applySave(message: TravelRest): void {
        this.#checkDrift(message)
        this.engine.load(message.save)
        this.#standing = message.number
    }

    #move({ to, depth }: TravelMove): void {
        const travel = this.engine
        const place = placeAt(travel.journey, to)
        travel.depth = depth
        travel.jump(place)
    }

    /** Tell when the party, on the same map, is not where its moves have it here. */
    #checkDrift({ number, sequence, save }: TravelRest): void {
        const travel = this.engine
        const isSameMap = this.#standing === number && travel.journey.scenery === save.journey.scenery
        if(!isSameMap) return
        const own = travel.place && travel.journey.places.indexOf(travel.place)
        if(own !== save.place) this.onDesync?.({ number, sequence })
    }

    #fail(error: unknown): void {
        if(!this.onError) throw error
        this.onError(error)
    }
}

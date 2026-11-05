import { loadRun } from "../sim/save/runSave"
import { placeAt } from "../sim/save/travelSave"
import type { Travel } from "../sim/travel/Travel"

import type { SyncSource } from "./SyncChannel"
import { readTravelMessage } from "./TravelMessage"
import type { TravelMessage, TravelMove, TravelRest } from "./TravelMessage"

/** How a journey loaded came. */
export interface TravelLoaded {
    /** Is it the journey of another run, rather than the same one as it stands? */
    readonly newJourney: boolean
}

/** A viewer the party was told to stand elsewhere than where its moves had it: one of them was lost. */
export interface TravelDesync {
    /** Which journey, and which message of it told. */
    readonly journey: number
    readonly sequence: number
}

/**
 * A viewer of a journey played elsewhere: it loads the run each time the main client sends it, and moves the
 * party on its own map in between, which its {@link Travel} tells as the journey played would.
 *
 * @remarks
 * Unlike a battle, a journey is not played again from what is sent, so every move counts: they wait in order
 * for whatever is being shown to end, and only a run that stands makes those before it pointless.
 */
export class TravelReceiver {


    /** The journey being watched, its run with it, none before the first run came. */
    public travel: Travel|null = null

    /** What hears of each journey loaded, and how it came, nothing when none. */
    public onLoad: ((travel: Travel, loaded: TravelLoaded) => void)|null = null

    /** What hears that a move was lost, nothing when none. */
    public onDesync: ((desync: TravelDesync) => void)|null = null

    /**
     * What hears that a message could not be read or taken in. A failure nobody hears is thrown, so it is
     * never silent.
     */
    public onError: ((error: unknown) => void)|null = null

    /**
     * Is something still being shown? What comes meanwhile waits, until {@link TravelReceiver.release}. Never
     * by default.
     */
    public holding: (() => boolean)|null = null

    constructor(source: SyncSource){
        this.#listening = source.listen(text => this.receive(text))
    }


    /** Take a message in: at once at a rest, after what is being shown otherwise. */
    public receive(text: string): void {
        let message: TravelMessage
        try {
            message = readTravelMessage(text)
        } catch(error){
            this.#fail(error)
            return
        }
        if(this.#isStale(message)) return
        this.#heard = { journey: message.journey, sequence: message.sequence }
        if(message.kind === "state"){
            this.#waiting.length = 0
            this.#standing = message.journey
        }
        this.#waiting.push(message)
        this.release()
    }

    /** What was being shown was shown to its end: take in what came meanwhile. */
    public release(): void {
        while(this.#waiting.length > 0 && !this.holding?.()){
            const message = this.#waiting.shift()
            try {
                if(message?.kind === "state") this.#load(message)
                else if(message) this.#move(message)
            } catch(error){
                this.#fail(error)
            }
        }
    }

    /** Stop listening, and leave the journey being watched as it is. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }

    /** What came and waits to be taken in, in order. */
    readonly #waiting: TravelMessage[] = []

    /** The journey and the message last heard, none before the first. */
    #heard: { readonly journey: number, readonly sequence: number }|null = null

    /** The journey a run came for, none before the first: a move of another has no map to go on. */
    #standing: number|null = null

    /** The journey of the run loaded, none before the first. */
    #loaded: number|null = null

    /** Is a message older than the last heard, or a move with no map, which joining late may bring? */
    #isStale(message: TravelMessage): boolean {
        if(message.kind === "moved" && message.journey !== this.#standing) return true
        const heard = this.#heard
        if(!heard) return false
        if(message.journey !== heard.journey) return message.journey < heard.journey
        return message.sequence <= heard.sequence
    }

    #load(message: TravelRest): void {
        this.#checkDrift(message)
        const { travel } = loadRun(message.save)
        const newJourney = this.#loaded !== message.journey
        this.travel = travel
        this.#loaded = message.journey
        this.onLoad?.(travel, { newJourney })
    }

    #move({ to, depth }: TravelMove): void {
        const { travel } = this
        if(!travel) return
        const place = placeAt(travel.journey, to)
        travel.depth = depth
        travel.jump(place)
    }

    /** Tell when the party, on the same map, is not where its moves have it here. */
    #checkDrift({ journey, sequence, save }: TravelRest): void {
        const { travel } = this
        const isSameMap = travel !== null && this.#loaded === journey
            && travel.journey.scenery === save.travel.journey.scenery
        if(!isSameMap) return
        const own = travel.place && travel.journey.places.indexOf(travel.place)
        if(own !== save.travel.place) this.onDesync?.({ journey, sequence })
    }

    #fail(error: unknown): void {
        if(!this.onError) throw error
        this.onError(error)
    }
}

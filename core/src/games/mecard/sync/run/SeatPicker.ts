import { Fault } from "../../../../engine/net/Fault"

import { SEAT_OFFER_TOPIC, SEAT_RELEASE_TOPIC, SEAT_TAKE_TOPIC } from "../SyncChannel"
import type { SyncLink, SyncSource } from "../SyncChannel"
import { signal } from "../faults"
import { readSeatOfferMessage, writeSeatWishMessage } from "./SeatOfferMessage"
import type { SeatOffer } from "./SeatOfferMessage"
import type { Removable } from "../../../../lifetime"

/**
 * A client choosing what it plays: it asks the host for a seat, or gives one back, and hears which seats can
 * be asked for and who holds them.
 *
 * @remarks
 * It only asks. What it plays it learns, as ever, from what the host tells it plays, which a RunGuest hears:
 * a refused wish is told by nothing, and shows as an offer where nothing changed in its favour.
 */
export class SeatPicker {


    /** Told of each offer of the host, which is the seats as they stand. */
    public readonly offered = signal<SeatOffer>()

    /** Told of an offer that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(
        /** The way to the host. */
        private readonly link: SyncLink,

        /** Where the offers come from. */
        source: SyncSource,
    ){
        this.#listening = SEAT_OFFER_TOPIC.source(source).listen(text => this.#told(text))
    }


    /** The offer last heard, none before the first. */
    public get offer(): SeatOffer|null { return this.#offer }

    /** Ask the host for a seat. */
    public take(unit: string): void {
        SEAT_TAKE_TOPIC.link(this.link).send(writeSeatWishMessage({ unit }))
    }

    /** Give a seat back to the host. */
    public release(unit: string): void {
        SEAT_RELEASE_TOPIC.link(this.link).send(writeSeatWishMessage({ unit }))
    }

    /** Stop listening. */
    public dispose(): void {
        this.#listening.remove()
    }


    readonly #listening: Removable
    #offer: SeatOffer|null = null

    #told(text: string): void {
        const offer = readSeatOfferMessage(text)
        if(offer instanceof Fault){
            this.faulted.notify(offer)
            return
        }
        this.#offer = offer
        this.offered.notify(offer)
    }
}

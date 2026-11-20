import { SEAT_OFFER_TOPIC, SEAT_RELEASE_TOPIC, SEAT_TAKE_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

/** What the host tells every client of the seats: which can be asked for, and who holds which. */
export interface SeatOffer {
    /** The units that may be given now, by their names. */
    readonly candidates: readonly string[]

    /** The id of the client holding each seat that is held, by the name of the unit. */
    readonly held: { readonly [unit: string]: string }

    /** The id of the client a seat that was freed is kept for, by the name of the unit: nobody else is given it yet. */
    readonly reserved?: { readonly [unit: string]: string }
}

/** A client wishing for a seat, or giving one back. */
export interface SeatWish {
    /** The unit, by its name. */
    readonly unit: string
}

/** An offer as sent. */
export function writeSeatOfferMessage(offer: SeatOffer): string {
    return JSON.stringify(offer)
}

/** An offer as received, or why it cannot be read. */
export function readSeatOfferMessage(text: string): SeatOffer|UnreadableFault {
    const message = readJson(SEAT_OFFER_TOPIC.name, text) as Partial<SeatOffer>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isOffer = typeof message === "object" && message !== null
        && Array.isArray(message.candidates) && message.candidates.every(each => typeof each === "string")
        && typeof message.held === "object" && message.held !== null && !Array.isArray(message.held)
        && Object.values(message.held).every(each => typeof each === "string")
        && (message.reserved === undefined || (typeof message.reserved === "object" && message.reserved !== null
            && !Array.isArray(message.reserved) && Object.values(message.reserved).every(each => typeof each === "string")))
    if(!isOffer) return wrongShape(SEAT_OFFER_TOPIC.name, text, "offer of seats")
    return message as SeatOffer
}

/** A wish as sent. */
export function writeSeatWishMessage(wish: SeatWish): string {
    return JSON.stringify(wish)
}

/**
 * A wish as received, or why it cannot be read.
 *
 * @param topic - The topic it came on, which is the one of taking a seat, or of giving it back.
 */
export function readSeatWishMessage(
    topic: typeof SEAT_TAKE_TOPIC|typeof SEAT_RELEASE_TOPIC,
    text: string,
): SeatWish|UnreadableFault {
    const message = readJson(topic.name, text) as Partial<SeatWish>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    if(typeof message !== "object" || message === null || typeof message.unit !== "string"){
        return wrongShape(topic.name, text, "wish for a seat")
    }
    return message as SeatWish
}

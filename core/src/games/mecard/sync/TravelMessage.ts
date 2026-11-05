import { RUN_SAVE_VERSION } from "../sim/save/runSave"
import type { RunSave } from "../sim/save/runSave"

/** Where a message stands among those of the main client. */
interface TravelStamp {
    /** Which journey it is, from 1, one for each run, so a viewer tells a new run from what goes on. */
    readonly journey: number

    /** Which message of the journey it is, from 1, so a late one is told from a new one. */
    readonly sequence: number
}

/** The party went from a place to another, each by its rank on the map. */
export interface TravelMove extends TravelStamp {
    readonly kind: "moved"

    /** Where it stood, none before the first place of the floor. */
    readonly from: number|null

    readonly to: number

    /** How many places it went to, this one counted. */
    readonly depth: number
}

/** The run as it stands on the map, when a journey is followed and when a halt or a fight is left. */
export interface TravelRest extends TravelStamp {
    readonly kind: "state"
    readonly save: RunSave
}

/** What the main client tells its viewers of the journey. */
export type TravelMessage = TravelMove|TravelRest

/** A message as sent. */
export function writeTravelMessage(message: TravelMessage): string {
    return JSON.stringify(message)
}

/**
 * A message as received.
 *
 * @throws {@link Error} When it is no message of a journey, or of another version of the save.
 */
export function readTravelMessage(text: string): TravelMessage {
    const message = JSON.parse(text) as Partial<TravelMove>&Partial<TravelRest>|null
    const isStamped = typeof message === "object" && message !== null
        && typeof message.journey === "number" && typeof message.sequence === "number"
    const isMove = isStamped && message.kind === "moved" && typeof message.to === "number"
        && typeof message.depth === "number" && (message.from === null || typeof message.from === "number")
    const isRest = isStamped && message.kind === "state" && typeof message.save === "object" && message.save !== null
    if(!isMove && !isRest) throw new Error("A message of the journey came in another shape: is the other client up to date?")
    if(isRest && message.save?.version !== RUN_SAVE_VERSION){
        throw new Error(`The other client saves runs in version ${message.save?.version}, this one in ${RUN_SAVE_VERSION}.`)
    }
    return message as TravelMessage
}

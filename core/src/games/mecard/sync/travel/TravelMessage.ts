import { TRAVEL_SAVE_VERSION } from "../../sim/save/travelSave"
import type { TravelSave } from "../../sim/save/travelSave"

import { TRAVEL_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape, wrongVersion } from "../read"

/** Where a message stands among those of the main client. */
interface TravelStamp {
    /** Which journey it is, from 1, one for each run, so a viewer tells a new run from what goes on. */
    readonly number: number

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

/** The journey as it stands on the map, when it is told and when a halt is left. */
export interface TravelRest extends TravelStamp {
    readonly kind: "save"
    readonly save: TravelSave
}

/** The party entered the halt of the place it stands on, which opens. */
export interface TravelEntry extends TravelStamp {
    readonly kind: "entered"

    /** The place, by its rank on the map. */
    readonly place: number
}

/** A halt of a sort was visited where the party stands, with no place of its own. */
export interface TravelVisit extends TravelStamp {
    readonly kind: "visited"

    /** The id of the sort of halt. */
    readonly halt: string
}

/** The sorts of answer a dialog takes. */
export type TravelAnswerKind = "offer"|"hero"|"cards"|"catalog"|"confirm"

const ANSWER_KINDS: readonly string[] = ["offer", "hero", "cards", "catalog", "confirm"]

/** A dialog of the visit was answered. */
export interface TravelAnswer extends TravelStamp {
    readonly kind: "answered"

    /** The dialog, by its place among those open. */
    readonly dialog: number
    readonly answer: TravelAnswerKind

    /** The indices picked, none for a dialog only gone on with. */
    readonly picks: readonly number[]

    /** The thing of the catalogue picked, for a dialog that asks for one. */
    readonly pick?: { readonly category: string, readonly key: string }
}

/** A dialog of the visit was gone back from. */
export interface TravelBack extends TravelStamp {
    readonly kind: "back"

    /** The dialog, by its place among those open. */
    readonly dialog: number
}

/** The visit is over, told before the journey as it stands once it is. */
export interface TravelLeft extends TravelStamp {
    readonly kind: "left"
}

/** What the main client tells its viewers of the journey. */
export type TravelMessage = TravelMove|TravelRest|TravelEntry|TravelVisit|TravelAnswer|TravelBack|TravelLeft

/** What a message of the visit says, before it is stamped. */
export type TravelBody = Omit<TravelEntry, keyof TravelStamp>|Omit<TravelVisit, keyof TravelStamp>
    |Omit<TravelAnswer, keyof TravelStamp>|Omit<TravelBack, keyof TravelStamp>
    |Omit<TravelLeft, keyof TravelStamp>

/** A message as sent. */
export function writeTravelMessage(message: TravelMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read: it is no message of a journey, or of another version. */
export function readTravelMessage(text: string): TravelMessage|UnreadableFault {
    const parsed = readJson(TRAVEL_TOPIC.name, text)
    if(parsed instanceof UnreadableFault) return parsed
    const message = parsed as Partial<Omit<TravelMove, "kind">&Omit<TravelRest, "kind">&Omit<TravelEntry, "kind">
        &Omit<TravelVisit, "kind">&Omit<TravelAnswer, "kind">&Omit<TravelBack, "kind">>&{ kind?: string }|null
    const isStamped = typeof message === "object" && message !== null
        && typeof message.number === "number" && typeof message.sequence === "number"
    const isMove = isStamped && message.kind === "moved" && typeof message.to === "number"
        && typeof message.depth === "number" && (message.from === null || typeof message.from === "number")
    const isRest = isStamped && message.kind === "save" && typeof message.save === "object" && message.save !== null
    const isEntry = isStamped && message.kind === "entered" && typeof message.place === "number"
    const isVisit = isStamped && message.kind === "visited" && typeof message.halt === "string"
    const isAnswer = isStamped && message.kind === "answered" && typeof message.dialog === "number"
        && typeof message.answer === "string" && ANSWER_KINDS.includes(message.answer)
        && Array.isArray(message.picks) && message.picks.every(index => typeof index === "number")
        && (message.pick === undefined || (typeof message.pick === "object" && message.pick !== null
            && typeof message.pick.category === "string" && typeof message.pick.key === "string"))
    const isBack = isStamped && message.kind === "back" && typeof message.dialog === "number"
    const isLeft = isStamped && message.kind === "left"
    if(!isMove && !isRest && !isEntry && !isVisit && !isAnswer && !isBack && !isLeft){
        return wrongShape(TRAVEL_TOPIC.name, text, "message of the journey")
    }
    if(isRest && message.save?.version !== TRAVEL_SAVE_VERSION){
        return wrongVersion(TRAVEL_TOPIC.name, text, message.save?.version, TRAVEL_SAVE_VERSION)
    }
    return message as TravelMessage
}

import { UnreadableFault } from "../../faults"
import { readJson, wrongShape } from "../../read"
import { LIVES_TOPIC } from "./topics"

/** What the hub tells of the lives: those of every player, in place of what it told before. */
export interface LifeMessage {
    /** The lives each player has left, by its id. */
    readonly lives: Readonly<Record<string, number>>
}

/** A message as sent. */
export function writeLifeMessage(message: LifeMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read. */
export function readLifeMessage(text: string): LifeMessage|UnreadableFault {
    const message = readJson(LIVES_TOPIC.name, text) as Partial<LifeMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const lives = typeof message === "object" && message !== null ? message.lives : undefined
    const isMessage = typeof lives === "object" && lives !== null
        && Object.values(lives).every(each => typeof each === "number")
    if(!isMessage) return wrongShape(LIVES_TOPIC.name, text, "message of the lives")
    return message as LifeMessage
}

import { UnreadableFault } from "../../../../sync/faults"
import { readJson, wrongShape } from "../../../../sync/read"
import { DUEL_FIGHT_TOPIC, DUEL_WATCH_TOPIC } from "./modeTopics"

/** What the hub tells a player of the duel it fights. */
export interface DuelFightMessage {
    /** The number of the duel in its round, which the topics of its battle go by. */
    readonly number: number

    /** The players of its camp, itself among them, by their ids. */
    readonly allies: readonly string[]

    /** The players of the other camp, by their ids. */
    readonly opponents: readonly string[]

    /** The units it plays in the battle, by their names there. */
    readonly units: readonly string[]
}

/** What the hub tells a spectator of the duel it watches. */
export interface DuelWatchMessage {
    readonly number: number

    /** The players of each camp, by their ids. */
    readonly sides: readonly (readonly string[])[]
}

function isNames(value: unknown): boolean {
    return Array.isArray(value) && value.every(each => typeof each === "string")
}

/** A message as sent. */
export function writeDuelFightMessage(message: DuelFightMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read. */
export function readDuelFightMessage(text: string): DuelFightMessage|UnreadableFault {
    const message = readJson(DUEL_FIGHT_TOPIC.name, text) as Partial<DuelFightMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isMessage = typeof message === "object" && message !== null && Number.isInteger(message.number)
        && isNames(message.allies) && isNames(message.opponents) && isNames(message.units)
    if(!isMessage) return wrongShape(DUEL_FIGHT_TOPIC.name, text, "message of a duel")
    return message as DuelFightMessage
}

/** A message as sent. */
export function writeDuelWatchMessage(message: DuelWatchMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read. */
export function readDuelWatchMessage(text: string): DuelWatchMessage|UnreadableFault {
    const message = readJson(DUEL_WATCH_TOPIC.name, text) as Partial<DuelWatchMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isMessage = typeof message === "object" && message !== null && Number.isInteger(message.number)
        && Array.isArray(message.sides) && message.sides.every(isNames)
    if(!isMessage) return wrongShape(DUEL_WATCH_TOPIC.name, text, "message of a duel watched")
    return message as DuelWatchMessage
}

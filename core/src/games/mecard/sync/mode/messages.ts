import { SyncTopic } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

/** The manager telling a client a run is shown to it, or owned by it. */
export const OPEN_RUN_TOPIC = new SyncTopic("open-run")

/** The manager telling a client a battle is shown to it, or owned by it. */
export const OPEN_BATTLE_TOPIC = new SyncTopic("open-battle")

/** The manager telling a client an instance is over for it. */
export const CLOSE_TOPIC = new SyncTopic("close")

/** The manager telling the owner of an instance that someone follows it: it tells what it plays. */
export const FOLLOW_TOPIC = new SyncTopic("follow")

/** The manager telling the owner of an instance that nobody follows it any more. */
export const UNFOLLOW_TOPIC = new SyncTopic("unfollow")

/** The manager telling a client something that happened. */
export const ORDER_TOPIC = new SyncTopic("order")

/** The manager telling every client a state, as it stands. */
export const STATE_TOPIC = new SyncTopic("state")

/** A client telling the manager something. */
export const TELL_TOPIC = new SyncTopic("tell")

/** A client telling the manager what it wants done on an instance it controls. */
export const INTENT_TOPIC = new SyncTopic("intent")

/** The manager passing an intent on to the owner of the instance, a client. */
export const ROUTE_TOPIC = new SyncTopic("route")

/** What the messages of an instance go by, from the manager to those that follow it. */
export function instanceTopic(id: number): SyncTopic {
    return new SyncTopic(`i${id}`)
}

/** What the messages of an instance go by, from its owner, a client, to the manager. */
export function upTopic(id: number): SyncTopic {
    return new SyncTopic(`u${id}`)
}

/** An instance shown to a client, which owns it or follows it. */
export interface OpenMessage {
    readonly id: number

    /** What the mode makes it from, on every client. */
    readonly spec: unknown

    /** Does the client own it: it makes it, and it is the one the others follow. */
    readonly own: boolean

    /** What the manager gave the client with `control`, none for one that does not act on it. */
    readonly info: unknown
}

/** What an instance is told apart by. */
export interface IdMessage {
    readonly id: number
}

/** Something that happened, told to a client. */
export interface OrderMessage {
    readonly order: unknown
}

/** A state, none when it is taken back. */
export interface StateMessage {
    readonly key: string
    readonly value: unknown
}

/** What a client tells the manager. */
export interface TellMessage {
    readonly message: unknown
}

/** What a client wants done on an instance. */
export interface IntentMessage {
    readonly id: number
    readonly intent: unknown
}

/** An intent on its way to the owner of the instance. */
export interface RouteMessage {
    readonly id: number

    /** Who wants it, and the name it goes by. */
    readonly from: string
    readonly name: string
    readonly info: unknown
    readonly intent: unknown
}

function objectOf(topic: SyncTopic, text: string, what: string): Record<string, unknown>|UnreadableFault {
    const read = readJson(topic.name, text)
    if(read instanceof UnreadableFault) return read
    if(typeof read !== "object" || read === null || Array.isArray(read)) return wrongShape(topic.name, text, what)
    return read as Record<string, unknown>
}

/** A message as sent. */
export function write(message: object): string {
    return JSON.stringify(message)
}

export function readOpenMessage(topic: SyncTopic, text: string): OpenMessage|UnreadableFault {
    const read = objectOf(topic, text, "instance opened")
    if(read instanceof UnreadableFault) return read
    const { id, spec, own, info } = read
    if(typeof id !== "number" || typeof own !== "boolean") return wrongShape(topic.name, text, "instance opened")
    return { id, spec, own, info: info ?? null }
}

export function readIdMessage(topic: SyncTopic, text: string): IdMessage|UnreadableFault {
    const read = objectOf(topic, text, "instance")
    if(read instanceof UnreadableFault) return read
    if(typeof read.id !== "number") return wrongShape(topic.name, text, "instance")
    return { id: read.id }
}

export function readOrderMessage(text: string): OrderMessage|UnreadableFault {
    const read = objectOf(ORDER_TOPIC, text, "order")
    if(read instanceof UnreadableFault) return read
    return { order: read.order ?? null }
}

export function readStateMessage(text: string): StateMessage|UnreadableFault {
    const read = objectOf(STATE_TOPIC, text, "state")
    if(read instanceof UnreadableFault) return read
    if(typeof read.key !== "string") return wrongShape(STATE_TOPIC.name, text, "state")
    return { key: read.key, value: read.value ?? null }
}

export function readTellMessage(text: string): TellMessage|UnreadableFault {
    const read = objectOf(TELL_TOPIC, text, "message to the manager")
    if(read instanceof UnreadableFault) return read
    return { message: read.message ?? null }
}

export function readIntentMessage(text: string): IntentMessage|UnreadableFault {
    const read = objectOf(INTENT_TOPIC, text, "intent")
    if(read instanceof UnreadableFault) return read
    if(typeof read.id !== "number") return wrongShape(INTENT_TOPIC.name, text, "intent")
    return { id: read.id, intent: read.intent ?? null }
}

export function readRouteMessage(text: string): RouteMessage|UnreadableFault {
    const read = objectOf(ROUTE_TOPIC, text, "routed intent")
    if(read instanceof UnreadableFault) return read
    const { id, from, name, info, intent } = read
    if(typeof id !== "number" || typeof from !== "string" || typeof name !== "string"){
        return wrongShape(ROUTE_TOPIC.name, text, "routed intent")
    }
    return { id, from, name, info: info ?? null, intent: intent ?? null }
}

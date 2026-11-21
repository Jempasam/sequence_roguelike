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

/** The manager telling a client something, which is not told again to one that comes back. */
export const ORDER_TOPIC = new SyncTopic("order")

/** The manager telling every client a published state, as it stands. */
export const STATE_TOPIC = new SyncTopic("state")

/** A client telling the manager something on an instance or a store, which has no answer. */
export const ACT_TOPIC = new SyncTopic("act")

/** A client asking the manager something on an instance or a store: the answer comes back. */
export const ASK_TOPIC = new SyncTopic("ask")

/** The manager passing an act on to the owner of the instance, a client. */
export const ROUTE_TOPIC = new SyncTopic("route")

/** The manager passing an ask on to the owner of the instance, a client. */
export const ROUTE_ASK_TOPIC = new SyncTopic("route-ask")

/** The owner of an instance, a client, answering an ask the manager passed on. */
export const REPLY_TOPIC = new SyncTopic("reply")

/** The manager answering what a client asked. */
export const ANSWER_TOPIC = new SyncTopic("answer")

/** What the messages of an instance go by, from the manager to those that follow it. */
export function instanceTopic(id: number): SyncTopic {
    return new SyncTopic(`i${id}`)
}

/** What the messages of an instance go by, from its owner, a client, to the manager. */
export function upTopic(id: number): SyncTopic {
    return new SyncTopic(`u${id}`)
}

/** An instance or a store shown to a client, which owns it or follows it. */
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

/** A state of a store, none when it is taken back. */
export interface StateMessage {
    readonly key: string
    readonly value: unknown
}

/** What a client says on an instance or a store. */
export interface ActMessage {
    readonly id: number
    readonly message: unknown
}

/** What a client asks on an instance or a store: `req` tells its answer. */
export interface AskMessage extends ActMessage {
    readonly req: number
}

/** An act on its way to the owner of the instance, a client. */
export interface RouteMessage extends ActMessage {
    /** Who says it, and the name it goes by: none when it is the manager. */
    readonly from: string|null
    readonly name: string|null
    readonly info: unknown
}

/** An ask on its way to the owner of the instance, a client. */
export interface RouteAskMessage extends RouteMessage {
    readonly req: number
}

/** What the owner of an instance answers to a routed ask. */
export interface ReplyMessage {
    readonly req: number
    readonly value: unknown
}

/** What a client is answered: `fault` is the reason there was none. */
export interface AnswerMessage {
    readonly req: number
    readonly value: unknown
    readonly fault: string|null
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

export function readActMessage(text: string): ActMessage|UnreadableFault {
    const read = objectOf(ACT_TOPIC, text, "act")
    if(read instanceof UnreadableFault) return read
    if(typeof read.id !== "number") return wrongShape(ACT_TOPIC.name, text, "act")
    return { id: read.id, message: read.message ?? null }
}

export function readAskMessage(text: string): AskMessage|UnreadableFault {
    const read = objectOf(ASK_TOPIC, text, "ask")
    if(read instanceof UnreadableFault) return read
    if(typeof read.id !== "number" || typeof read.req !== "number") return wrongShape(ASK_TOPIC.name, text, "ask")
    return { id: read.id, req: read.req, message: read.message ?? null }
}

/** Who says it: a player with a name, or none for the manager. */
function isWho(from: unknown, name: unknown): from is string|null|undefined {
    if(typeof from === "string") return typeof name === "string"
    return (from === null || from === undefined) && (name === null || name === undefined)
}

export function readRouteMessage(text: string): RouteMessage|UnreadableFault {
    const read = objectOf(ROUTE_TOPIC, text, "routed act")
    if(read instanceof UnreadableFault) return read
    const { id, from, name, info, message } = read
    if(typeof id !== "number" || !isWho(from, name)){
        return wrongShape(ROUTE_TOPIC.name, text, "routed act")
    }
    return {
        id, from: from ?? null, name: (name as string|null|undefined) ?? null, info: info ?? null,
        message: message ?? null,
    }
}

export function readRouteAskMessage(text: string): RouteAskMessage|UnreadableFault {
    const read = objectOf(ROUTE_ASK_TOPIC, text, "routed ask")
    if(read instanceof UnreadableFault) return read
    const { id, from, name, info, message, req } = read
    if(typeof id !== "number" || !isWho(from, name) || typeof req !== "number"){
        return wrongShape(ROUTE_ASK_TOPIC.name, text, "routed ask")
    }
    return {
        id, from: from ?? null, name: (name as string|null|undefined) ?? null, info: info ?? null,
        message: message ?? null, req,
    }
}

export function readReplyMessage(text: string): ReplyMessage|UnreadableFault {
    const read = objectOf(REPLY_TOPIC, text, "reply")
    if(read instanceof UnreadableFault) return read
    if(typeof read.req !== "number") return wrongShape(REPLY_TOPIC.name, text, "reply")
    return { req: read.req, value: read.value ?? null }
}

export function readAnswerMessage(text: string): AnswerMessage|UnreadableFault {
    const read = objectOf(ANSWER_TOPIC, text, "answer")
    if(read instanceof UnreadableFault) return read
    if(typeof read.req !== "number") return wrongShape(ANSWER_TOPIC.name, text, "answer")
    return { req: read.req, value: read.value ?? null, fault: typeof read.fault === "string" ? read.fault : null }
}

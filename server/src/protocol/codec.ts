import type {
    ClientMessage, IceServer, JsonValue, Member, PeerSignal, RoomRefusal, RoomShape, ServerMessage,
} from "./messages"

/** The longest message either side sends, in characters. A session description is the largest. */
export const MAX_MESSAGE_LENGTH = 64 * 1024

/** The longest data a member tells about itself, in characters of JSON. */
export const MAX_DATA_LENGTH = 4 * 1024

/** The longest name of a room, in characters. */
export const MAX_NAME_LENGTH = 64

/** The most members a room may be created for. A mesh of N members opens N(N-1)/2 connections. */
export const MAX_CAPACITY = 64

/** A message of the protocol that came in another shape: the other side is not up to date, or broken. */
export class ProtocolError extends Error {


    constructor(message: string){
        super(message)
        this.name = "ProtocolError"
    }
}

/** A message as sent, by either side. */
export function writeMessage(message: ClientMessage|ServerMessage): string {
    return JSON.stringify(message)
}

/**
 * A message a client sent, as the server receives it.
 *
 * @throws {@link ProtocolError} When it is not one, or breaks a limit.
 */
export function readClientMessage(text: string): ClientMessage {
    const message = parse(text)
    switch(message.type){
        case "hello":
            return { type: "hello", version: integer(message.version, "version") }
        case "create":
            return {
                type: "create",
                shape: shape(message.shape),
                name: limited(message.name, "name", MAX_NAME_LENGTH),
                data: data(message.data),
                capacity: capacity(message.capacity),
            }
        case "join":
            return { type: "join", code: string(message.code, "code"), data: data(message.data) }
        case "admit":
            return { type: "admit", member: string(message.member, "member"), accepted: bool(message.accepted) }
        case "setData":
            return { type: "setData", data: data(message.data) }
        case "signal":
            return { type: "signal", to: string(message.to, "to"), signal: signal(message.signal) }
        default:
            throw new ProtocolError(`A client sent a message of an unknown type: ${String(message.type)}.`)
    }
}

/**
 * A message the server sent, as a client receives it.
 *
 * @throws {@link ProtocolError} When it is not one.
 */
export function readServerMessage(text: string): ServerMessage {
    const message = parse(text)
    switch(message.type){
        case "welcome":
            return { type: "welcome", iceServers: list(message.iceServers, "iceServers").map(iceServer) }
        case "entered":
            return {
                type: "entered",
                code: string(message.code, "code"),
                name: string(message.name, "name"),
                shape: shape(message.shape),
                self: member(message.self),
                owner: string(message.owner, "owner"),
                members: list(message.members, "members").map(member),
            }
        case "refused":
            return { type: "refused", reason: refusal(message.reason) }
        case "knocking":
        case "joined":
        case "changed":
            return { type: message.type, member: member(message.member) }
        case "left":
        case "owner":
            return { type: message.type, member: string(message.member, "member") }
        case "closed":
            return { type: "closed" }
        case "signal":
            return { type: "signal", from: string(message.from, "from"), signal: signal(message.signal) }
        case "error":
            return { type: "error", message: string(message.message, "message") }
        default:
            throw new ProtocolError(`The server sent a message of an unknown type: ${String(message.type)}.`)
    }
}


//// The checks of each field ////

/** A message as an object, before its fields are checked. */
type Fields = { readonly [key: string]: unknown }

function parse(text: string): Fields {
    if(text.length > MAX_MESSAGE_LENGTH) throw new ProtocolError(`A message is ${text.length} characters long, over ${MAX_MESSAGE_LENGTH}.`)
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch(error){
        throw new ProtocolError(`A message is no JSON: ${(error as Error).message}`)
    }
    return object(value, "message")
}

function object(value: unknown, name: string): Fields {
    const isObject = typeof value === "object" && value !== null && !Array.isArray(value)
    if(!isObject) throw new ProtocolError(`${name} is no object.`)
    return value as Fields
}

function list(value: unknown, name: string): readonly unknown[] {
    if(!Array.isArray(value)) throw new ProtocolError(`${name} is no list.`)
    return value
}

function string(value: unknown, name: string): string {
    if(typeof value !== "string") throw new ProtocolError(`${name} is no string.`)
    return value
}

function limited(value: unknown, name: string, max: number): string {
    const text = string(value, name)
    if(text.length > max) throw new ProtocolError(`${name} is ${text.length} characters long, over ${max}.`)
    return text
}

function bool(value: unknown): boolean {
    if(typeof value !== "boolean") throw new ProtocolError("accepted is no boolean.")
    return value
}

function integer(value: unknown, name: string): number {
    if(!Number.isInteger(value)) throw new ProtocolError(`${name} is no integer.`)
    return value as number
}

function capacity(value: unknown): number {
    const count = integer(value, "capacity")
    if(count < 1 || count > MAX_CAPACITY) throw new ProtocolError(`capacity is ${count}, out of 1 to ${MAX_CAPACITY}.`)
    return count
}

function shape(value: unknown): RoomShape {
    if(value !== "star" && value !== "mesh") throw new ProtocolError(`shape is ${String(value)}, neither star nor mesh.`)
    return value
}

function refusal(value: unknown): RoomRefusal {
    const isRefusal = value === "not-found" || value === "full" || value === "refused" || value === "closed"
    if(!isRefusal) throw new ProtocolError(`reason is ${String(value)}, no refusal.`)
    return value
}

// The data came out of JSON.parse, so it is JSON already: only its size is checked.
function data(value: unknown): JsonValue {
    if(value === undefined) throw new ProtocolError("data is missing.")
    const length = JSON.stringify(value).length
    if(length > MAX_DATA_LENGTH) throw new ProtocolError(`data is ${length} characters of JSON, over ${MAX_DATA_LENGTH}.`)
    return value as JsonValue
}

function member(value: unknown): Member {
    const fields = object(value, "member")
    return { id: string(fields.id, "member.id"), data: data(fields.data) }
}

function iceServer(value: unknown): IceServer {
    const fields = object(value, "iceServer")
    const urls = list(fields.urls, "iceServer.urls").map(url => string(url, "iceServer.urls[]"))
    const hasCredentials = fields.username !== undefined || fields.credential !== undefined
    if(!hasCredentials) return { urls }
    return {
        urls,
        username: string(fields.username, "iceServer.username"),
        credential: string(fields.credential, "iceServer.credential"),
    }
}

function signal(value: unknown): PeerSignal {
    const fields = object(value, "signal")
    switch(fields.kind){
        case "description": {
            const type = fields.type
            if(type !== "offer" && type !== "answer") throw new ProtocolError(`signal.type is ${String(type)}.`)
            return { kind: "description", type, sdp: string(fields.sdp, "signal.sdp") }
        }
        case "candidate": {
            const mid = fields.sdpMid ?? null
            const index = fields.sdpMLineIndex ?? null
            return {
                kind: "candidate",
                candidate: string(fields.candidate, "signal.candidate"),
                sdpMid: mid === null ? null : string(mid, "signal.sdpMid"),
                sdpMLineIndex: index === null ? null : integer(index, "signal.sdpMLineIndex"),
            }
        }
        default:
            throw new ProtocolError(`signal.kind is ${String(fields.kind)}.`)
    }
}

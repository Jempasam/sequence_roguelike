/**
 * The version of the protocol between the clients and the signaling server. A client of another version is
 * refused at its `hello`, since the two would misread each other.
 */
export const PROTOCOL_VERSION = 1

/** A value that JSON carries as it is: what the members of a room tell each other about themselves. */
export type JsonValue = null|boolean|number|string|readonly JsonValue[]|{ readonly [key: string]: JsonValue }

/**
 * How the members of a room are linked:
 * - `"star"`: one host, the owner, at the center. Each other member links to the host only, and knows of
 *   no one else. The room closes when the host leaves.
 * - `"mesh"`: every member links to every other one. When the owner leaves, the oldest member takes over,
 *   and the room closes when the last member leaves.
 */
export type RoomShape = "star"|"mesh"

/** A member of a room, as the others know it. */
export interface Member {
    /** The name the server gave the member, unique within the server while it is connected. */
    readonly id: string

    /** What the member says about itself. Every member it is linked to reads it: nothing secret. */
    readonly data: JsonValue
}

/** A server that leads to a peer: STUN to learn one's public address, TURN to relay through it. */
export interface IceServer {
    readonly urls: readonly string[]
    readonly username?: string
    readonly credential?: string
}

/**
 * What one peer hands another, through the server, to open a WebRTC connection: its session description,
 * or one of its ICE candidates.
 */
export type PeerSignal =
    | { readonly kind: "description", readonly type: "offer"|"answer", readonly sdp: string }
    | {
        readonly kind: "candidate"
        readonly candidate: string
        readonly sdpMid: string|null
        readonly sdpMLineIndex: number|null
    }

/**
 * Why a room could not be entered, or was left without a word from the member:
 * - `"not-found"`: no room has this code.
 * - `"full"`: the room holds as many members as it may.
 * - `"refused"`: the owner refused the member.
 * - `"closed"`: the room closed, or its owner left while the member waited.
 */
export type RoomRefusal = "not-found"|"full"|"refused"|"closed"

/** What a client sends the server. */
export type ClientMessage =
    | { readonly type: "hello", readonly version: number }
    | {
        readonly type: "create"
        readonly shape: RoomShape
        readonly name: string
        readonly data: JsonValue
        readonly capacity: number
    }
    | { readonly type: "join", readonly code: string, readonly data: JsonValue }
    | { readonly type: "admit", readonly member: string, readonly accepted: boolean }
    | { readonly type: "setData", readonly data: JsonValue }
    | { readonly type: "signal", readonly to: string, readonly signal: PeerSignal }

/** What the server sends a client. */
export type ServerMessage =
    | { readonly type: "welcome", readonly iceServers: readonly IceServer[] }
    | {
        readonly type: "entered"
        readonly code: string
        readonly name: string
        readonly shape: RoomShape
        readonly self: Member
        readonly owner: string

        /** The members the client is to link to, each of which waits for its offer. */
        readonly members: readonly Member[]
    }
    | { readonly type: "refused", readonly reason: RoomRefusal }
    | { readonly type: "knocking", readonly member: Member }
    | { readonly type: "joined", readonly member: Member }
    | { readonly type: "left", readonly member: string }
    | { readonly type: "changed", readonly member: Member }
    | { readonly type: "owner", readonly member: string }
    | { readonly type: "closed" }
    | { readonly type: "signal", readonly from: string, readonly signal: PeerSignal }
    | { readonly type: "error", readonly message: string }

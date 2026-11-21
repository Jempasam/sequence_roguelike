import type { IceServer, JsonValue, PeerSignal, RoomShape, ServerMessage } from "@game/server/protocol"

import type { NetError } from "./NetError"
import type { Removable } from "../../lifetime"

/** The room a client entered, as the signaling described it. */
export type RoomEntry = Omit<Extract<ServerMessage, { type: "entered" }>, "type">

/** What the signaling tells a member of a room, once it is in. */
export type RoomEvent = Extract<
    ServerMessage,
    { type: "knocking"|"joined"|"left"|"changed"|"owner"|"signal" }
>

/** What a room is created with. */
export interface RoomCreation {
    readonly shape: RoomShape
    readonly name: string
    readonly data: JsonValue

    /** The most members the room holds, its owner included. */
    readonly capacity: number

    /**
     * The code the room is to have, for others to find it beforehand: the signaling makes one up when there
     * is none, and refuses with `"taken"` when an open room has it.
     */
    readonly code?: string
}

/**
 * Reaches a signaling for one room: each call is a new connection. The connector knows where the signaling is
 * and what its kind needs, so whoever calls it knows neither.
 *
 * @throws {@link NetError} When the signaling cannot be reached, or speaks another version.
 */
export type SignalingConnector = () => Promise<Signaling>

/**
 * What a {@link Room} needs of the way players meet, whichever it is: the signaling server of the game, or a
 * public relay of peer ids. It is for one room, entered once, which leaving closes.
 *
 * @remarks
 * Every implementation tells the same events in the same order, as the server of the game does: a newcomer
 * is told of the members it is to link to on entering, and a member is told of a newcomer by `knocking` while
 * the owner decides, then `joined`.
 */
export interface Signaling {
    /** The STUN and TURN servers to make peer connections with, credentials included. */
    readonly iceServers: readonly IceServer[]

    /**
     * Create a room and enter it as its owner.
     *
     * @throws {@link NetError} When the code asked for is taken (`"taken"`), or the connection is lost.
     */
    create(room: RoomCreation): Promise<RoomEntry>

    /**
     * Ask to enter a room, and wait for its owner's word.
     *
     * @throws {@link NetError} When the room is not found, full, or refuses, or the connection is lost.
     */
    join(code: string, data: JsonValue): Promise<RoomEntry>

    /** Let a member waiting at the door in, or turn it away. Only the owner is heard. */
    admit(member: string, accepted: boolean): void

    /** Change what this member says about itself. */
    setData(data: JsonValue): void

    /** Pass a signal of WebRTC to a member linked to this one. */
    signal(to: string, signal: PeerSignal): void

    /** Hear what is told of the room, until the returned handle is disposed. */
    onEvent(handler: (event: RoomEvent) => void): Removable

    /** Be told once the client is disconnected, which takes it out of its room. */
    onClose(handler: (reason: NetError) => void): Removable

    /** Leave the room and disconnect. Doing it twice changes nothing. */
    close(): void
}

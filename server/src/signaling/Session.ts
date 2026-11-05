import { randomBytes } from "node:crypto"
import type { WebSocket } from "ws"

import { writeMessage } from "../protocol"
import type { JsonValue, ServerMessage } from "../protocol"
import type { Room } from "./Room"

/** How many random bytes a session id is made of: enough that no two sessions ever share one. */
const ID_BYTES = 9

/** The WebSocket close code of a client that broke the protocol. */
const PROTOCOL_ERROR = 1002

/** The longest reason a WebSocket close frame carries, in characters: 123 bytes of UTF-8 at most. */
const MAX_REASON_LENGTH = 120

/**
 * One client connected to the signaling server. It is in at most one room at a time, as a member or as one
 * waiting to be admitted, and leaves it by closing its socket.
 */
export class Session {


    /** The name of the session, which is its member id in a room: lowercase letters and digits. */
    public readonly id = randomBytes(ID_BYTES).toString("hex")

    /** Has the client said hello in the version of the server? Nothing else is heard before. */
    public greeted = false

    /** The room the session is in or waits to enter, none before it creates or joins one. */
    public room: Room|null = null

    /** What the session said about itself on entering its room. */
    public data: JsonValue = null


    constructor(
        socket: WebSocket,
    ){
        this.#socket = socket
    }


    public send(message: ServerMessage): void {
        // A socket closing meanwhile drops the message: the room hears of the leave from its close event.
        if(this.#socket.readyState !== this.#socket.OPEN) return
        this.#socket.send(writeMessage(message))
    }

    /** Tell the client what it did wrong, and disconnect it. */
    public fail(message: string): void {
        this.send({ type: "error", message })
        this.#socket.close(PROTOCOL_ERROR, message.slice(0, MAX_REASON_LENGTH))
    }


    readonly #socket: WebSocket
}

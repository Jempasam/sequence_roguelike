import { signal } from "../../lifetime"
import { PROTOCOL_VERSION, ProtocolError, readServerMessage, writeMessage } from "@game/server/protocol"
import type { ClientMessage, IceServer, JsonValue, PeerSignal, ServerMessage } from "@game/server/protocol"

import type { NetPort, TimerPort } from "../../platform"
import { ClientSocket } from "./ClientSocket"
import { NetError } from "./NetError"
import type { RoomCreation, RoomEntry, RoomEvent, Signaling } from "./Signaling"
import type { Removable } from "../../lifetime"

/** What a refusal to enter a room is told as. */
const REFUSAL_TEXT = {
    "not-found": "No room has this code.",
    "full": "The room is full.",
    "refused": "The owner of the room refused to let this member in.",
    "closed": "The room closed while this member waited to enter.",
    "taken": "Another room has this code already.",
} as const

/** How long the server may take to welcome a client before it is given up, in milliseconds. */
export const WELCOME_TIMEOUT = 8_000

/**
 * A client of the signaling server of the game, for one room: it says hello, creates or joins the room, then
 * hears of the members and passes the signals of WebRTC. Leaving the room is closing the client.
 */
export class SignalingClient implements Signaling {


    /**
     * Reach a signaling server and say hello.
     *
     * @param timer - Where time goes, to give up on a server that accepts the connection but never welcomes
     * the client: the connection is closed then, rather than left open for ever. Without it, there is no limit.
     * @throws {@link NetError} When the server cannot be reached, or speaks another version, or is silent.
     */
    public static async connect(
        net: NetPort, url: string, timer?: TimerPort, welcomeTimeout = WELCOME_TIMEOUT,
    ): Promise<SignalingClient> {
        const client = new SignalingClient(net, url)
        const wait = timer?.after(welcomeTimeout, () => {
            client.#socket.closeFor(new NetError("unreachable", `${url} did not welcome the client in time.`))
        })
        try {
            await client.welcomed
        } finally {
            wait?.cancel()
        }
        return client
    }


    /** Settles once the server welcomed the client, or fails with a {@link NetError} when it did not. */
    public readonly welcomed: Promise<void>


    constructor(net: NetPort, url: string){
        const socket = new ClientSocket(net, url)
        this.#socket = socket
        this.welcomed = new Promise((resolve, reject) => {
            this.#onWelcome = resolve
            this.#onRefusal = reject
        })
        socket.listen(text => this.#hear(text))
        socket.onClose(reason => {
            this.#onRefusal(reason)
            this.#events.clear()
        })
        void socket.opened.then(() => this.#send({ type: "hello", version: PROTOCOL_VERSION }), () => {})
    }


    /** The STUN and TURN servers to make peer connections with, credentials included. */
    public get iceServers(): readonly IceServer[] { return this.#iceServers }

    /**
     * Create a room and enter it as its owner.
     *
     * @throws {@link NetError} When the code asked for is taken (`"taken"`, and the client may ask again
     * under another), or the connection is lost meanwhile.
     */
    public create(room: RoomCreation): Promise<RoomEntry> {
        return this.#enter({ type: "create", ...room })
    }

    /**
     * Ask to enter a room, and wait for its owner's word.
     *
     * @throws {@link NetError} When the room is not found, full, or refuses, or the connection is lost.
     */
    public join(code: string, data: JsonValue): Promise<RoomEntry> {
        return this.#enter({ type: "join", code, data })
    }

    /** Let a member waiting at the door in, or turn it away. Only the owner is heard. */
    public admit(member: string, accepted: boolean): void {
        this.#send({ type: "admit", member, accepted })
    }

    /** Change what this member says about itself. */
    public setData(data: JsonValue): void {
        this.#send({ type: "setData", data })
    }

    /** Pass a signal of WebRTC to a member linked to this one. */
    public signal(to: string, signal: PeerSignal): void {
        this.#send({ type: "signal", to, signal })
    }

    /** Hear what the server tells of the room, until the returned handle is disposed. */
    public onEvent(handler: (event: RoomEvent) => void): Removable {
        return this.#events.add(handler)
    }

    /** Be told once the client is disconnected, which takes it out of its room. */
    public onClose(handler: (reason: NetError) => void): Removable {
        return this.#socket.onClose(handler)
    }

    /** Leave the room and disconnect. Doing it twice changes nothing. */
    public close(): void {
        this.#socket.close()
    }


    readonly #socket: ClientSocket
    readonly #events = signal<RoomEvent>()
    #iceServers: readonly IceServer[] = []
    #onWelcome: () => void = () => {}

    /** Fails what waits for the server: the welcome, then the entry into the room. */
    #onRefusal: (reason: NetError) => void = () => {}
    #onEntered: ((entry: RoomEntry) => void)|null = null

    #enter(message: ClientMessage): Promise<RoomEntry> {
        if(this.#onEntered) throw new Error("A signaling client is entering a room already, and is for one room.")
        return new Promise((resolve, reject) => {
            this.#onEntered = resolve
            this.#onRefusal = reject
            this.#send(message)
        })
    }

    #send(message: ClientMessage): void {
        this.#socket.send(writeMessage(message))
    }

    #hear(text: string): void {
        let message: ServerMessage
        try {
            message = readServerMessage(text)
        } catch(error){
            if(!(error instanceof ProtocolError)) throw error
            this.#socket.closeFor(new NetError("protocol", error.message))
            return
        }
        switch(message.type){
            case "welcome":
                this.#iceServers = message.iceServers
                this.#onWelcome()
                break
            case "entered":
                this.#onEntered?.({
                    code: message.code, name: message.name, shape: message.shape, self: message.self,
                    owner: message.owner, members: message.members,
                })
                break
            case "refused":
                this.#onRefusal(new NetError(message.reason, REFUSAL_TEXT[message.reason]))
                this.#onEntered = null
                break
            case "closed":
                this.#socket.closeFor(new NetError("closed", "The room closed: its host left."))
                break
            case "error":
                this.#socket.closeFor(new NetError("protocol", `The server refused what this client sent: ${message.message}`))
                break
            default:
                this.#events.notify(message)
                break
        }
    }
}

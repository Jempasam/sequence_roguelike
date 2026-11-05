import { WebSocketServer } from "ws"
import type { RawData, WebSocket } from "ws"

import { MAX_MESSAGE_LENGTH, PROTOCOL_VERSION, ProtocolError, readClientMessage } from "../protocol"
import type { ClientMessage } from "../protocol"
import type { IceConfig } from "./IceConfig"
import type { Room } from "./Room"
import { RoomRegistry } from "./RoomRegistry"
import { Session } from "./Session"

/** How often each client is pinged, in milliseconds. One that missed the last ping is cut off. */
const HEARTBEAT = 15_000

/** How many bytes a message may take in UTF-8, where each character takes four at most. */
const MAX_PAYLOAD = MAX_MESSAGE_LENGTH * 4

/** What the signaling server is started with. */
export interface SignalingOptions {
    /** The port to listen on, 0 for any free one. */
    readonly port: number

    /** The STUN and TURN servers the clients are told about. */
    readonly ice: IceConfig
}

/**
 * The WebSocket endpoint players connect to, to meet in rooms and exchange WebRTC offers, answers and ICE
 * candidates. It never sees game state.
 *
 * @remarks
 * A client says `hello` first, in the version of the protocol, then creates or joins one room, and leaves
 * it by closing its socket. A client that breaks the protocol is told why and disconnected.
 */
export class SignalingServer {


    /** The port the server listens on, once it does. */
    public readonly listening: Promise<number>


    constructor(
        public readonly options: SignalingOptions,
    ){
        this.#server = new WebSocketServer({ port: options.port, maxPayload: MAX_PAYLOAD })
        this.#server.on("connection", socket => this.#welcome(socket))
        this.listening = new Promise((resolve, reject) => {
            this.#server.once("listening", () => {
                const address = this.#server.address()
                if(typeof address !== "object" || address === null){
                    reject(new Error("The signaling server listens without a port."))
                    return
                }
                console.log(`Signaling listening on ws://localhost:${address.port}`)
                resolve(address.port)
            })
            this.#server.once("error", error => {
                reject(new Error(`Signaling server failed on port ${options.port}: ${error.message}`))
            })
        })
        this.#heartbeat = setInterval(() => this.#ping(), HEARTBEAT)
    }


    /** How many rooms are open. */
    public get rooms(): number { return this.#rooms.size }

    public close(): Promise<void> {
        clearInterval(this.#heartbeat)
        for(const socket of this.#sessions.keys()) socket.terminate()
        return new Promise((resolve, reject) => {
            this.#server.close(error => error ? reject(error) : resolve())
        })
    }


    readonly #server: WebSocketServer
    readonly #heartbeat: ReturnType<typeof setInterval>
    readonly #rooms = new RoomRegistry()
    readonly #sessions = new Map<WebSocket, Session>()

    /** The sockets that answered the last ping. */
    readonly #alive = new Set<WebSocket>()

    #welcome(socket: WebSocket): void {
        const session = new Session(socket)
        this.#sessions.set(socket, session)
        this.#alive.add(socket)
        socket.on("pong", () => this.#alive.add(socket))
        socket.on("close", () => {
            this.#sessions.delete(socket)
            this.#alive.delete(socket)
            session.room?.leave(session)
        })
        socket.on("message", (data, isBinary) => this.#hear(session, data, isBinary))
    }

    #ping(): void {
        for(const socket of this.#sessions.keys()){
            if(!this.#alive.has(socket)){
                socket.terminate()
                continue
            }
            this.#alive.delete(socket)
            socket.ping()
        }
    }

    #hear(session: Session, data: RawData, isBinary: boolean): void {
        try {
            if(isBinary) throw new ProtocolError("A message came in binary, where the protocol is text.")
            this.#handle(session, readClientMessage(data.toString()))
        } catch(error){
            if(!(error instanceof Error)) throw error
            session.fail(error.message)
        }
    }

    /** @throws {@link Error} When the message breaks the protocol at this point. */
    #handle(session: Session, message: ClientMessage): void {
        if(!session.greeted && message.type !== "hello") throw new ProtocolError("A client spoke before its hello.")
        switch(message.type){
            case "hello":
                if(session.greeted) throw new ProtocolError("A client said hello twice.")
                if(message.version !== PROTOCOL_VERSION){
                    throw new ProtocolError(`The client speaks version ${message.version} of the protocol, the server ${PROTOCOL_VERSION}.`)
                }
                session.greeted = true
                session.send({ type: "welcome", iceServers: this.options.ice.serversFor(session.id) })
                break
            case "create":
                this.#ensureOutside(session)
                session.data = message.data
                const { shape, name, capacity } = message
                this.#rooms.create(session, { shape, name, capacity })
                break
            case "join": {
                this.#ensureOutside(session)
                session.data = message.data
                const room = this.#rooms.find(message.code)
                if(room) room.knock(session)
                else session.send({ type: "refused", reason: "not-found" })
                break
            }
            case "admit":
                this.#roomOf(session).admit(session, message.member, message.accepted)
                break
            case "setData":
                this.#roomOf(session).setData(session, message.data)
                break
            case "signal":
                this.#roomOf(session).relay(session, message.to, message.signal)
                break
            default:
                throw new ProtocolError("A client sent a message the server does not handle.")
        }
    }

    #ensureOutside(session: Session): void {
        if(session.room) throw new ProtocolError("A client is in a room already, and a socket is for one room.")
    }

    #roomOf(session: Session): Room {
        if(!session.room) throw new ProtocolError("A client spoke to a room it is not in.")
        return session.room
    }
}

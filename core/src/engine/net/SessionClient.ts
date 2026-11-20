import type { JsonValue } from "@game/server/protocol"

import type { Cancel, SyncLink, TimerPort } from "../../platform"
import type { Connection } from "./Connection"
import { Fault } from "./Fault"
import { Listeners } from "./Listeners"
import { ConnectionLostFault, RefusedFault, RoomNotFoundFault, SessionExpiredFault, faultOf } from "./NetFaults"
import { RANDOM_TEXT, SESSION_VERSION, writeSession } from "./Session"
import type { RandomText, SessionInfo } from "./Session"

/** What a {@link SessionClient} is made with. */
export interface SessionClientOptions {
    readonly timer: TimerPort

    /** How long it tries to come back after a loss, in milliseconds, before the session is given up. */
    readonly graceMs: number

    /** How long it waits between two tries to come back, in milliseconds. */
    readonly retryMs: number

    /** The version of the sessions it speaks, the current one by default. */
    readonly version?: number

    /** Where it draws its session from, the cryptographic source of the environment by default. */
    readonly random?: RandomText
}

/**
 * A client of a {@link SessionHost} that comes back after a connection drops: it draws a session itself,
 * says it in what it tells the room of itself, and joins again with the same session until the host lets
 * it back or the grace is over.
 *
 * @remarks
 * Nothing here throws, and no promise rejects: what the layer below rejects with is caught where the client
 * joins, and told as a {@link Fault}: `faulted` for a connection lost, which it deals with by trying again,
 * `ended` for what it cannot deal with.
 *
 * It keeps no queue: what is sent while the connection is lost is dropped, since it does not know what the
 * messages are for. What sits above it tells again what it needs when {@link SessionClient.reconnected} is
 * told.
 */
export class SessionClient {


    /** Told each time the connection is lost and it starts trying to come back. */
    public readonly reconnecting = new Listeners<void>()

    /** Told each time it came back. */
    public readonly reconnected = new Listeners<void>()

    /** Told of what was dealt with: a connection lost. */
    public readonly faulted = new Listeners<Fault>()

    /** Told once, when it cannot go on: the room is not found, refuses, or the session is over. */
    public readonly ended = new Listeners<Fault>()

    /** The session it joins with. */
    public readonly session: SessionInfo

    /** The way to the host, the same through every connection. */
    public readonly link: SyncLink = {
        send: message => this.#send(message),
        listen: handler => this.#listen(handler),
    }

    constructor(
        /** Join the room with what the client says of itself, which is where its session is. */
        private readonly join: (data: JsonValue) => Promise<Connection>,

        private readonly options: SessionClientOptions,
    ){
        const random = options.random ?? RANDOM_TEXT
        this.session = {
            id: random(8),
            secret: random(16),
            version: options.version ?? SESSION_VERSION,
        }
    }


    /** Is the client connected to the host? */
    public get isConnected(): boolean { return this.#connection !== null }

    /**
     * Join the room. It settles once the connection is open, or once it could not be: the fault is then told
     * by `ended`.
     */
    public async connect(): Promise<void> {
        const connection = await this.#join()
        if(connection instanceof Fault){
            this.#end(connection)
            return
        }
        if(this.#isStopped) connection.close()
        else this.#attach(connection)
    }

    /** Leave the room. The session is not given back: the host waits for it until its grace is over. */
    public close(): void {
        this.#stop()
        this.#connection?.close()
        this.#connection = null
    }


    #connection: Connection|null = null
    #listening: { dispose(): void }|null = null
    #closing: { dispose(): void }|null = null
    #retry: Cancel|null = null
    #deadline = 0
    #isStopped = false
    readonly #handlers = new Set<{ handler: (message: string) => void }>()

    /** @returns The connection, or why there is none. */
    async #join(): Promise<Connection|Fault> {
        try {
            return await this.join(writeSession(this.session))
        } catch(error){
            return faultOf(error)
        }
    }

    #attach(connection: Connection): void {
        this.#connection = connection
        this.#listening = connection.listen(message => {
            for(const { handler } of [...this.#handlers]) handler(message)
        })
        this.#closing = connection.onClose(() => this.#dropped(connection))
    }

    #dropped(connection: Connection): void {
        if(this.#isStopped || this.#connection !== connection) return
        this.#listening?.dispose()
        this.#closing?.dispose()
        this.#connection = null
        this.#deadline = this.options.timer.now() + this.options.graceMs
        this.faulted.emit(new ConnectionLostFault(null))
        this.reconnecting.emit()
        void this.#comeBack()
    }

    /** Join again until the host lets the session back, or no more. */
    async #comeBack(): Promise<void> {
        const connection = await this.#join()
        if(!(connection instanceof Fault)){
            if(this.#isStopped){
                connection.close()
                return
            }
            this.#attach(connection)
            this.reconnected.emit()
            return
        }
        if(this.#isStopped) return
        const expired = new SessionExpiredFault(this.session.id)
        // A refusal to a client coming back is the host's: it knows no such session any more.
        if(connection instanceof RefusedFault) return this.#end(expired)
        if(connection instanceof RoomNotFoundFault) return this.#end(connection)
        if(this.options.timer.now() >= this.#deadline) return this.#end(expired)
        this.#retry = this.options.timer.after(this.options.retryMs, () => {
            this.#retry = null
            void this.#comeBack()
        })
    }

    #end(fault: Fault): void {
        if(this.#isStopped) return
        this.#stop()
        this.ended.emit(fault)
    }

    #stop(): void {
        this.#isStopped = true
        this.#retry?.cancel()
        this.#retry = null
        this.#listening?.dispose()
        this.#closing?.dispose()
    }

    #send(message: string): void {
        if(!this.#connection) return
        try {
            this.#connection.send(message)
        } catch{
            // The connection closed since it was last seen open: the loss is told apart.
        }
    }

    #listen(handler: (message: string) => void): { dispose(): void } {
        const entry = { handler }
        this.#handlers.add(entry)
        return { dispose: () => this.#handlers.delete(entry) }
    }
}

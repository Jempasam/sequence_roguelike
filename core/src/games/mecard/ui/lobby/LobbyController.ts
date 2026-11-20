import { Fault } from "../../../../engine/net/Fault"
import type { Chat } from "../../sync/chat/Chat"
import { signal } from "../../sync/faults"
import type { HostBoard, HostEntry } from "../../sync/hosts/HostDirectory"
import { Lobby } from "../../sync/lobby/Lobby"
import { LobbyGuest } from "../../sync/lobby/LobbyGuest"
import type { LobbyMode } from "../../sync/lobby/LobbyMode"
import type { ModeSelection } from "../../sync/lobby/ModeSelection"
import type { ModeSelectionView } from "../../sync/lobby/ModeSelectionView"
import type { RosterEntry } from "../../sync/lobby/RosterMessage"
import type { JoinedRoom, OpenedRoom } from "../MecardGame"

/** How the lobby reaches the others: the way the game opens a room, or joins one. */
export interface LobbyNetwork {
    /** Open a room that others join. */
    open(): OpenedRoom

    /** Join the room of a code, to speak to its host. */
    join(code: string): JoinedRoom

    /** Join the list of the rooms hosted, shared with everyone looking at it. It never rejects. */
    directory(): Promise<HostBoard|Fault>
}

/** Where the player stands: not in a room, on the way to one, or in it. */
export type LobbyPhase = "disconnected"|"connecting"|"connected"

/** What the lobby says when the player cannot be told apart from the others. */
export class NoClientsFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "Cette plateforme ne distingue pas les clients : pas de lobby."
    }
}

/** What the lobby says when it cannot speak to the host. */
export class NoHostLinkFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "Cette plateforme ne permet pas de parler à l'hôte : pas de lobby."
    }
}

/**
 * The room of the lobby on the screen side: it opens or joins a session, and keeps what lives in it as long
 * as the player stays. It is the only place that knows how the session is opened, so screens only read it.
 *
 * @remarks
 * Nothing here throws: a room that cannot be opened or joined, or that the host closes, leaves the player out
 * of the room with the reason in {@link LobbyController.error}.
 */
export class LobbyController {


    /** Told each time anything the screens show changes. */
    public readonly changed = signal<void>()

    /** Told once each time the player is put out of the room by what is not their doing, with why. */
    public readonly dropped = signal<Fault>()

    constructor(
        private readonly network: LobbyNetwork,

        /** The modes the lobby offers. */
        public readonly modes: readonly LobbyMode[],
    ){}


    public get phase(): LobbyPhase { return this.#phase }

    /** The code of the room, none until it is open. */
    public get code(): string|null { return this.#code }

    /** Why the last attempt to open or join a room failed, or why the room was lost; none otherwise. */
    public get error(): Fault|null { return this.#error }

    /** Does the player host the room? */
    public get isHost(): boolean { return this.#lobby !== null }

    /** Is a game being played? */
    public get playing(): boolean { return this.#lobby?.playing ?? this.#guest?.playing ?? false }

    /** The rooms hosted by the players looking, none while the list is not reached. */
    public get hosts(): readonly HostEntry[] { return this.#directory?.hosts ?? [] }

    /**
     * Look at the list of the rooms hosted while the lobby is shown. The list is kept as long as the player
     * hosts a room, so that it is told of, and let go of when the lobby is hidden with no room.
     */
    public watch(isWatching: boolean): void {
        if(this.#isWatching === isWatching) return
        this.#isWatching = isWatching
        if(isWatching) void this.#openDirectory()
        else this.#closeDirectory()
    }

    /** The group chat, none until there is one. */
    public get chat(): Chat|null { return this.#lobby?.chat ?? this.#guest?.chat ?? null }

    /** Who is in the room, in the order they came, the host first. */
    public get members(): readonly RosterEntry[] {
        return this.#lobby?.roster.members ?? this.#guest?.roster.members ?? []
    }

    /** The name the player was given in the room, none until it is told. */
    public get selfName(): string|null {
        if(this.#lobby) return this.#lobby.roster.members[0].name
        return this.#guest?.roster.self?.name ?? null
    }

    /** The id of the player in the room, none until it is told. */
    public get selfId(): string|null {
        if(this.#lobby) return this.#lobby.roster.members[0].id
        return this.#guest?.roster.self?.id ?? null
    }

    /** What decides the mode, for the host. */
    public get selection(): ModeSelection|null { return this.#lobby?.selection ?? null }

    /** What the host decided, for a client. */
    public get view(): ModeSelectionView|null { return this.#guest?.selection ?? null }

    /** Open a room and be its host. */
    public host(name: string): void {
        if(this.#phase !== "disconnected") return
        const room = this.network.open()
        if(!room.room){
            room.close()
            this.#fail(new NoClientsFault())
            return
        }
        const lobby = new Lobby(room.room, room, name, this.modes)
        this.#lobby = lobby
        this.#close = () => room.close()
        this.#follow([
            lobby.roster.changed.add(() => this.changed.notify()),
            lobby.selection.changed.add(() => this.changed.notify()),
            lobby.gameChanged.add(() => {
                this.#publish()
                this.changed.notify()
            }),
            lobby.faulted.add(fault => this.#fault(fault)),
        ])
        const session = this.#begin()
        void room.ready.then(code => this.#opened(session, code))
    }

    /** Join the room of a code. */
    public join(code: string, name: string): void {
        if(this.#phase !== "disconnected") return
        const joined = this.network.join(code.trim().toUpperCase())
        const { link } = joined
        if(!link){
            joined.close()
            this.#fail(new NoHostLinkFault())
            return
        }
        const guest = new LobbyGuest(link, link, name, this.modes)
        this.#guest = guest
        this.#close = () => joined.close()
        const ended = joined.ended.add(fault => this.#lost(fault))
        this.#follow([
            guest.roster.changed,
            guest.selection.changed,
            guest.changed,
        ].map(observable => observable.add(() => this.changed.notify())))
        this.#handles.push(ended, guest.faulted.add(fault => this.#fault(fault)))
        this.#handles.push(guest.roster.refused.add(fault => this.#lost(fault)))
        const session = this.#begin()
        void joined.ready.then(opened => this.#opened(session, opened))
    }

    /** Start the game of the mode the lobby is set on, as the host. */
    public start(): void {
        const fault = this.#lobby?.start() ?? null
        if(fault) this.#faults.push(fault)
        this.changed.notify()
    }

    /** End the game being played, as the host. */
    public stop(): void {
        this.#lobby?.stop()
    }

    /** What went wrong in the room since the last call, which is then forgotten. */
    public takeFaults(): readonly Fault[] {
        return this.#faults.splice(0)
    }

    /** Leave the room, and close the session. */
    public leave(): void {
        this.#teardown()
        this.#error = null
        this.changed.notify()
    }


    #phase: LobbyPhase = "disconnected"
    #code: string|null = null
    #error: Fault|null = null
    #lobby: Lobby|null = null
    #guest: LobbyGuest|null = null
    #close: (() => void)|null = null
    #session: object|null = null
    #directory: HostBoard|null = null
    #directoryHandle: { remove(): void }|null = null
    #isWatching = false
    #opening = false

    /** The code of the room the directory lists, none when it lists none. */
    #announced: string|null = null
    #handles: { dispose?(): void, remove?(): void }[] = []
    readonly #faults: Fault[] = []

    #follow(handles: readonly { remove(): void }[]): void {
        this.#handles.push(...handles)
    }

    /** Start a session, which what is awaited of it is checked against: it may be left before it answers. */
    #begin(): object {
        const session = {}
        this.#session = session
        this.#phase = "connecting"
        this.#code = null
        this.#error = null
        this.changed.notify()
        return session
    }

    #fault(fault: Fault): void {
        this.#faults.push(fault)
        this.changed.notify()
    }

    #opened(session: object, code: string|Fault): void {
        if(this.#session !== session) return
        if(code instanceof Fault){
            this.#teardown()
            this.#fail(code)
            return
        }
        this.#phase = "connected"
        this.#code = code
        this.#publish()
        this.changed.notify()
    }

    /** The room was lost to the player: the host left, the connection is gone, or the lobby refused them. */
    #lost(fault: Fault): void {
        if(this.#phase === "disconnected") return
        const wasConnecting = this.#phase === "connecting"
        this.#teardown()
        this.#error = fault
        if(wasConnecting){
            // The room was never reached: the player stays where they were, with the reason shown.
            this.#faults.push(fault)
            this.changed.notify()
            return
        }
        this.dropped.notify(fault)
        this.changed.notify()
    }

    #fail(fault: Fault): void {
        this.#phase = "disconnected"
        this.#error = fault
        this.changed.notify()
    }

    /** Open the list of the rooms, unless it is open or opening. */
    async #openDirectory(): Promise<void> {
        if(this.#directory || this.#opening) return
        this.#opening = true
        const opened = await this.network.directory()
        this.#opening = false
        if(opened instanceof Fault){
            this.#faults.push(opened)
            this.changed.notify()
            return
        }
        // The lobby was left, with no room, while the list was being reached.
        if(!this.#isWatching && this.#phase === "disconnected"){
            opened.dispose()
            return
        }
        this.#directory = opened
        this.#directoryHandle = opened.changed.add(() => this.changed.notify())
        this.#publish()
        this.changed.notify()
    }

    #closeDirectory(): void {
        // A host is listed as long as its room stands.
        if(this.#phase !== "disconnected") return
        this.#directoryHandle?.remove()
        this.#directoryHandle = null
        this.#directory?.dispose()
        this.#directory = null
        this.#announced = null
        this.changed.notify()
    }

    /** List the room if the player hosts one others may join, and unlist it otherwise. */
    #publish(): void {
        const directory = this.#directory
        if(!directory) return
        const code = this.#lobby && this.#phase === "connected" && !this.playing ? this.#code : null
        if(code === this.#announced) return
        this.#announced = code
        if(code === null) directory.retire()
        else directory.announce(code, this.selfName ?? "")
    }

    #teardown(): void {
        for(const handle of this.#handles){
            handle.remove?.()
            handle.dispose?.()
        }
        this.#handles = []
        this.#lobby?.dispose()
        this.#guest?.dispose()
        this.#lobby = null
        this.#guest = null
        this.#session = null
        const close = this.#close
        this.#close = null
        close?.()
        this.#phase = "disconnected"
        this.#code = null
        this.#publish()
        if(!this.#isWatching) this.#closeDirectory()
    }
}

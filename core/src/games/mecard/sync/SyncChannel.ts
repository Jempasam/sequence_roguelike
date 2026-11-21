import type { SyncLink, SyncPeer, SyncRoom } from "../../../platform"
import type { Removable } from "../../../lifetime"

/** Where the messages of a game go: a channel to the viewers, whatever carries them. */
export interface SyncSender {
    /** Send a message to every viewer connected. */
    send(message: string): void

    /**
     * Give each viewer connecting a first message, read when it connects, none when there is nothing to tell
     * yet, until the returned handle is disposed. A viewer hears them in the order they were asked for.
     */
    onPeer(initial: () => string|null): Removable
}

/** Where the messages of a game come from, for a viewer. */
export interface SyncSource {
    /** Hear each message, until the returned handle is disposed. */
    listen(handler: (message: string) => void): Removable
}

/** The way between this client and one other, in both directions. */
export type { SyncLink, SyncPeer, SyncRoom } from "../../../platform"

/**
 * What a part of a game talks about, so several share one channel: each hears only the messages of its own
 * topic, and knows nothing of the others.
 */
export class SyncTopic {


    constructor(
        /** What tells its messages apart. */
        public readonly name: string,
    ){}


    /** A sender writing the messages of the topic on a channel. */
    public sender(channel: SyncSender): SyncSender {
        return {
            send: message => channel.send(this.#prefix + message),
            onPeer: initial => channel.onPeer(() => {
                const message = initial()
                return message === null ? null : this.#prefix + message
            }),
        }
    }

    /** A link writing and hearing only the messages of the topic on a link. */
    public link(link: SyncLink): SyncLink {
        return {
            send: message => link.send(this.#prefix + message),
            listen: this.source(link).listen,
        }
    }

    /** A source hearing only the messages of the topic on a channel. */
    public source(channel: SyncSource): SyncSource {
        return {
            listen: handler => channel.listen(message => {
                if(message.startsWith(this.#prefix)) handler(message.slice(this.#prefix.length))
            }),
        }
    }


    get #prefix(): string {
        return `${this.name}:`
    }
}

/** The battles of a run. */
export const BATTLE_TOPIC = new SyncTopic("battle")

/** The journey of a run, between its battles. */
export const TRAVEL_TOPIC = new SyncTopic("travel")

/** The run as a whole: the party, and which battle is being fought. */
export const RUN_TOPIC = new SyncTopic("run")

/** A client saying it came to play. */
export const JOIN_TOPIC = new SyncTopic("join")

/** The host telling a client what it plays. */
export const SEAT_TOPIC = new SyncTopic("seat")

/** A client giving the host its chains. */
export const PLAN_TOPIC = new SyncTopic("plan")

/** The host telling every client which seats can be asked for, and who holds them. */
export const SEAT_OFFER_TOPIC = new SyncTopic("seat-offer")

/** A client asking the host for a seat. */
export const SEAT_TAKE_TOPIC = new SyncTopic("seat-take")

/** A client giving a seat back to the host. */
export const SEAT_RELEASE_TOPIC = new SyncTopic("seat-release")

/** The host telling the clients who came to play. */
export const GATHER_MEMBERS_TOPIC = new SyncTopic("gather-members")

/** The host telling a client that came that the game starts. */
export const GATHER_START_TOPIC = new SyncTopic("gather-start")

/** The host telling a client that came that there is no room left for it. */
export const GATHER_FULL_TOPIC = new SyncTopic("gather-full")

/** The host telling a client that came that the game started already. */
export const GATHER_LATE_TOPIC = new SyncTopic("gather-late")

/**
 * A client of a gathering saying whether it is ready, `1` or `0`. A {@link Relay} on the same topic shows the
 * others, which then hear it with the id of who said it.
 */
export const READY_TOPIC = new SyncTopic("ready")

/** The host asking a client for the team it brings to a duel, and the client's answer. */
export const TEAM_TOPIC = new SyncTopic("team")

/**
 * The group chat: every member says a line, and a {@link Relay} on the same topic shows the others, which hear
 * it with the id of who said it.
 */
export const CHAT_TOPIC = new SyncTopic("chat")

/** A client of a lobby telling the host who it is: its name, and the version of the lobby it speaks. */
export const PROFILE_TOPIC = new SyncTopic("profile")

/** The host telling everyone who is in the lobby, as a state: whoever connects is told how it stands. */
export const ROSTER_TOPIC = new SyncTopic("roster")

/** The host telling a client who it is in the lobby, the name it was given and the id the others know it by. */
export const ROSTER_SELF_TOPIC = new SyncTopic("roster-self")

/** The host telling a client it is not let into the lobby, with the version of the lobby it speaks. */
export const PROFILE_REFUSED_TOPIC = new SyncTopic("profile-refused")

/**
 * The host telling everyone which mode of game the lobby is set on, with its settings, and whether it is being
 * played, as a state: whoever connects is told how it stands, and one that comes in the middle of a game knows
 * it is late.
 */
export const LOBBY_MODE_TOPIC = new SyncTopic("lobby-mode")

/**
 * A client of a game saying it takes part (`join`) or leaves it (`quit`), whichever moment of the game it is.
 * Both are idempotent: a client says them again until it is heard.
 */
export const PARTICIPATE_TOPIC = new SyncTopic("participate")

/**
 * The host telling a client how it takes part in the game, as a state: its role, and the seat it holds. It is
 * told again whenever the client joins again or its connection comes back.
 */
export const PARTICIPATION_TOPIC = new SyncTopic("participation")

/** A client telling the host it leaves the room for good, just before it closes its connection. */
export const QUIT_ROOM_TOPIC = new SyncTopic("quit-room")

/** The host telling every client the room is closed for good, just before it closes its connection. */
export const ROOM_CLOSED_TOPIC = new SyncTopic("room-closed")

/** The host telling how long is left before a deadline, none when there is none. */
export const DEADLINE_TOPIC = new SyncTopic("deadline")

/** The host telling that a deadline came. */
export const DEADLINE_EXPIRED_TOPIC = new SyncTopic("deadline-expired")

/**
 * A channel within the program, from one sender to every listener: what the tests synchronize through,
 * and the shape every transport takes.
 *
 * @remarks
 * Delivered at once by default, or held until {@link LocalSync.flush}, so a test can make a viewer late. Each
 * listener is a viewer connecting: it hears the first messages at once, held or not.
 */
export class LocalSync implements SyncSender, SyncSource {


    constructor(
        /** Are the messages held until flushed, as a slow network would? */
        public readonly held = false,
    ){}


    /** How many messages wait to be flushed. */
    public get waiting(): number { return this.#waiting.length }

    public send(message: string): void {
        if(this.held) this.#waiting.push(message)
        else this.#deliver(message)
    }

    public listen(handler: (message: string) => void): Removable {
        this.#handlers.add(handler)
        for(const { initial } of [...this.#peers]){
            const message = initial()
            if(message !== null) handler(message)
        }
        return { remove: () => this.#handlers.delete(handler) }
    }

    public onPeer(initial: () => string|null): Removable {
        const entry = { initial }
        this.#peers.add(entry)
        return { remove: () => this.#peers.delete(entry) }
    }

    /** Deliver the messages held, in the order they were sent. */
    public flush(): void {
        for(const message of this.#waiting.splice(0)) this.#deliver(message)
    }


    readonly #handlers = new Set<(message: string) => void>()
    readonly #peers = new Set<{ initial: () => string|null }>()
    readonly #waiting: string[] = []

    #deliver(message: string): void {
        for(const handler of [...this.#handlers]) handler(message)
    }
}


/** One client of a {@link LocalRoom}: the ends of its link, and whether its connection is dropped. */
interface LocalClient {
    readonly peer: SyncPeer
    readonly host: Set<(message: string) => void>
    isDropped: boolean
}

/**
 * A room within the program, each client on a link of its own, delivered at once: what the tests play
 * through, and the shape every transport takes. A test makes a client lose its connection with
 * {@link LocalRoom.drop}, bring it back with {@link LocalRoom.back}, and leave for good with
 * {@link LocalRoom.leave}.
 */
export class LocalRoom implements SyncRoom {


    public onJoin(handler: (peer: SyncPeer) => void): Removable {
        this.#joins.add(handler)
        return { remove: () => this.#joins.delete(handler) }
    }

    public onLost(handler: (peer: SyncPeer) => void): Removable {
        this.#losses.add(handler)
        return { remove: () => this.#losses.delete(handler) }
    }

    public onBack(handler: (peer: SyncPeer) => void): Removable {
        this.#backs.add(handler)
        return { remove: () => this.#backs.delete(handler) }
    }

    public onLeave(handler: (peer: SyncPeer) => void): Removable {
        this.#leaves.add(handler)
        return { remove: () => this.#leaves.delete(handler) }
    }

    /** Connect a client, and give the link it talks through. */
    public join(id: string): SyncLink {
        const host = new Set<(message: string) => void>()
        const client = new Set<(message: string) => void>()
        const hear = (handlers: Set<(message: string) => void>) => (handler: (message: string) => void) => {
            handlers.add(handler)
            return { remove: () => void handlers.delete(handler) }
        }
        const local: LocalClient = {
            host,
            isDropped: false,
            peer: {
                id,
                send: message => {
                    if(local.isDropped) return
                    for(const handler of [...client]) handler(message)
                },
                listen: hear(host),
            },
        }
        this.#clients.set(id, local)
        for(const handler of [...this.#joins]) handler(local.peer)
        return {
            send: message => {
                if(local.isDropped) return
                for(const handler of [...host]) handler(message)
            },
            listen: hear(client),
        }
    }

    /** Lose the connection of a client, which may come back: what is sent either way is dropped meanwhile. */
    public drop(id: string): void {
        const client = this.#clients.get(id)
        if(!client || client.isDropped) return
        client.isDropped = true
        for(const handler of [...this.#losses]) handler(client.peer)
    }

    /** Bring back the connection of a client that was dropped. */
    public back(id: string): void {
        const client = this.#clients.get(id)
        if(!client || !client.isDropped) return
        client.isDropped = false
        for(const handler of [...this.#backs]) handler(client.peer)
    }

    /** Disconnect a client for good. A client that is not connected is left alone. */
    public leave(id: string): void {
        const client = this.#clients.get(id)
        if(!client) return
        this.#clients.delete(id)
        for(const handler of [...this.#leaves]) handler(client.peer)
    }


    readonly #clients = new Map<string, LocalClient>()
    readonly #joins = new Set<(peer: SyncPeer) => void>()
    readonly #losses = new Set<(peer: SyncPeer) => void>()
    readonly #backs = new Set<(peer: SyncPeer) => void>()
    readonly #leaves = new Set<(peer: SyncPeer) => void>()
}

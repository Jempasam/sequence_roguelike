/** Where the messages of a game go: a channel to the viewers, whatever carries them. */
export interface SyncSender {
    /** Send a message to every viewer connected. */
    send(message: string): void

    /**
     * Give each viewer connecting a first message, read when it connects, none when there is nothing to tell
     * yet, until the returned handle is disposed. A viewer hears them in the order they were asked for.
     */
    onPeer(initial: () => string|null): { dispose(): void }
}

/** Where the messages of a game come from, for a viewer. */
export interface SyncSource {
    /** Hear each message, until the returned handle is disposed. */
    listen(handler: (message: string) => void): { dispose(): void }
}

/** The way between this client and one other, in both directions. */
export interface SyncLink extends SyncSource {
    /** Send a message to the other client. */
    send(message: string): void
}

/** A client connected to the host. */
export interface SyncPeer extends SyncLink {
    /** What tells it from the others, for as long as it stays. */
    readonly id: string
}

/** The clients connected to the host, each on its own link. */
export interface SyncRoom {
    /** Hear each client that connects, until the returned handle is disposed. */
    onJoin(handler: (peer: SyncPeer) => void): { dispose(): void }

    /** Hear each client that leaves, until the returned handle is disposed. */
    onLeave(handler: (peer: SyncPeer) => void): { dispose(): void }
}

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

    public listen(handler: (message: string) => void): { dispose(): void } {
        this.#handlers.add(handler)
        for(const { initial } of [...this.#peers]){
            const message = initial()
            if(message !== null) handler(message)
        }
        return { dispose: () => this.#handlers.delete(handler) }
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        const entry = { initial }
        this.#peers.add(entry)
        return { dispose: () => this.#peers.delete(entry) }
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

/**
 * A room within the program, each client on a link of its own, delivered at once: what the tests play
 * through, and the shape every transport takes.
 */
export class LocalRoom implements SyncRoom {


    public onJoin(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#joins.add(handler)
        return { dispose: () => this.#joins.delete(handler) }
    }

    public onLeave(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#leaves.add(handler)
        return { dispose: () => this.#leaves.delete(handler) }
    }

    /** Connect a client, and give the link it talks through. */
    public join(id: string): SyncLink {
        const host = new Set<(message: string) => void>()
        const client = new Set<(message: string) => void>()
        const hear = (handlers: Set<(message: string) => void>) => (handler: (message: string) => void) => {
            handlers.add(handler)
            return { dispose: () => handlers.delete(handler) }
        }
        const tell = (handlers: Set<(message: string) => void>) => (message: string) => {
            for(const handler of [...handlers]) handler(message)
        }
        const peer: SyncPeer = { id, send: tell(client), listen: hear(host) }
        this.#peers.set(id, peer)
        for(const handler of [...this.#joins]) handler(peer)
        return { send: tell(host), listen: hear(client) }
    }

    /** Disconnect a client. */
    public leave(id: string): void {
        const peer = this.#peers.get(id)
        if(!peer) throw new Error(`No client ${id} is connected.`)
        this.#peers.delete(id)
        for(const handler of [...this.#leaves]) handler(peer)
    }


    readonly #peers = new Map<string, SyncPeer>()
    readonly #joins = new Set<(peer: SyncPeer) => void>()
    readonly #leaves = new Set<(peer: SyncPeer) => void>()
}

/** Where the messages of a game go: a channel to the viewers, whatever carries them. */
export interface SyncSender {
    /**
     * Send a message.
     *
     * @param retained - The name it stays under for a viewer to come, in place of the last of that name, none
     * for a message that only matters to those listening now. A channel making viewers wait keeps nothing.
     */
    send(message: string, retained?: string): void
}

/** Where the messages of a game come from, for a viewer. */
export interface SyncSource {
    /** Hear each message, until the returned handle is disposed. */
    listen(handler: (message: string) => void): { dispose(): void }
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
        return { send: (message, retained) => channel.send(this.#prefix + message, retained) }
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

/**
 * A channel within the program, from one sender to every listener: what the tests synchronize through,
 * and the shape every transport takes.
 *
 * @remarks
 * Delivered at once by default, or held until {@link LocalSync.flush}, so a test can make a viewer late.
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
        return { dispose: () => this.#handlers.delete(handler) }
    }

    /** Deliver the messages held, in the order they were sent. */
    public flush(): void {
        for(const message of this.#waiting.splice(0)) this.#deliver(message)
    }


    readonly #handlers = new Set<(message: string) => void>()
    readonly #waiting: string[] = []

    #deliver(message: string): void {
        for(const handler of [...this.#handlers]) handler(message)
    }
}

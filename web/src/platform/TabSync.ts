import type { SyncPort, SyncRole } from "@game/core"

/** The name of the channel the tabs of the game talk on. */
const CHANNEL_NAME = "dungeon-of-the-mecard"

/** What a tab watching says as it comes, to hear where the game is: no string, so no message of the game. */
const HELLO = { hello: true }

/**
 * The clients of one game as tabs of one browser, on one origin: a `BroadcastChannel` carries the messages
 * from the tab playing to every tab watching. Enough to watch a game without a server; the network comes
 * later, behind the same port.
 *
 * @remarks
 * A channel does not tell who joins it: a tab watching says hello as it starts listening, and the tab playing
 * answers with the first messages. Every tab hears them, those already watching seeing them as old.
 */
export class TabSync implements SyncPort {


    /** None: a channel does not tell the tabs apart, so a tab only ever watches. */
    public readonly room = null

    public readonly link = null

    constructor(
        public readonly role: SyncRole,
    ){
        this.#channel = new BroadcastChannel(CHANNEL_NAME)
        this.#channel.addEventListener("message", event => {
            if(typeof event.data === "string") for(const handler of [...this.#handlers]) handler(event.data)
            else if(this.role === "main") this.#greet()
        })
    }


    public send(message: string): void {
        this.#channel.postMessage(message)
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        const entry = { initial }
        this.#peers.add(entry)
        return { dispose: () => this.#peers.delete(entry) }
    }

    public listen(handler: (message: string) => void): { dispose(): void } {
        // The answer comes later: every listener added now hears it.
        if(this.role === "viewer" && this.#handlers.size === 0) this.#channel.postMessage(HELLO)
        this.#handlers.add(handler)
        return { dispose: () => this.#handlers.delete(handler) }
    }

    /** Close the channel: nothing is sent nor heard any more. */
    public close(): void {
        this.#channel.close()
        this.#handlers.clear()
        this.#peers.clear()
    }


    readonly #channel: BroadcastChannel
    readonly #handlers = new Set<(message: string) => void>()
    readonly #peers = new Set<{ initial: () => string|null }>()

    /** Tell the tab that came where the game is. */
    #greet(): void {
        for(const { initial } of [...this.#peers]){
            const message = initial()
            if(message !== null) this.send(message)
        }
    }
}

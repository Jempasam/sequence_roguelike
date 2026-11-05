import type { SyncPort, SyncRole } from "@game/core"

/** The name of the channel the tabs of the game talk on. */
const CHANNEL_NAME = "dungeon-of-the-mecard"

/**
 * The clients of one game as tabs of one browser, on one origin: a `BroadcastChannel` carries the messages
 * from the tab playing to every tab watching. Enough to watch a game without a server; the network comes
 * later, behind the same port.
 */
export class TabSync implements SyncPort {


    constructor(
        public readonly role: SyncRole,
    ){
        this.#channel = new BroadcastChannel(CHANNEL_NAME)
        this.#channel.addEventListener("message", event => {
            if(typeof event.data !== "string") return
            for(const handler of [...this.#handlers]) handler(event.data)
        })
    }


    public send(message: string): void {
        this.#channel.postMessage(message)
    }

    public listen(handler: (message: string) => void): { dispose(): void } {
        this.#handlers.add(handler)
        return { dispose: () => this.#handlers.delete(handler) }
    }

    /** Close the channel: nothing is sent nor heard any more. */
    public close(): void {
        this.#channel.close()
        this.#handlers.clear()
    }


    readonly #channel: BroadcastChannel
    readonly #handlers = new Set<(message: string) => void>()
}

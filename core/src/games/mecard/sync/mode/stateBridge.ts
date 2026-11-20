import type { SyncSender, SyncSource } from "../SyncChannel"

import type { GameModeContext } from "./GameMode"

/** What a text is told apart by: what comes before its first colon, the topic of the brick that wrote it. */
function keyOf(message: string): string {
    const cut = message.indexOf(":")
    return cut < 0 ? message : message.slice(0, cut)
}

/**
 * A {@link SyncSender} that publishes what it is given as states of the game, so a brick that tells its
 * viewers
 * (the lives, a deadline) is used as it is: what a client connecting is first told is the state as it
 * stands, which
 * the runner gives to whoever arrives or comes back.
 *
 * @remarks
 * A state is named by the topic of the message. What a brick asks to say first with {@link
 * SyncSender.onPeer} becomes
 * the value of its state, read at each sending, so a time left is the time left of the one that is told,
 * and each
 * message sent tells of a change of it. A message sent for a topic with nothing to say first is an event,
 * told as a
 * state that changes each time, which a client that arrives later hears too.
 */
export class StatePublisher implements SyncSender {


    constructor(
        private readonly ctx: GameModeContext,
    ){}


    public send(message: string): void {
        const key = keyOf(message)
        const initial = this.#initials.get(key)
        if(initial) this.ctx.publishLazy(key, initial)
        else this.ctx.publish(key, `${message}${++this.#events}`)
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        const first = initial()
        if(first === null) return { dispose: () => {} }
        const key = keyOf(first)
        this.#initials.set(key, initial)
        this.ctx.publishLazy(key, initial)
        return {
            dispose: () => {
                if(this.#initials.get(key) !== initial) return
                this.#initials.delete(key)
                this.ctx.unpublish(key)
            },
        }
    }


    readonly #initials = new Map<string, () => string|null>()
    #events = 0
}

/**
 * A {@link SyncSource} of the states a player is told: what a brick that hears its viewers is given is each
 * state that
 * is a text, whatever its key, for the topics of the bricks to tell apart.
 */
export class StateSource implements SyncSource {


    public listen(handler: (message: string) => void): { dispose(): void } {
        this.#handlers.add(handler)
        return { dispose: () => this.#handlers.delete(handler) }
    }

    /** Pass on a state the player was told. */
    public receive(value: unknown): void {
        if(typeof value !== "string") return
        for(const handler of [...this.#handlers]) handler(value)
    }


    readonly #handlers = new Set<(message: string) => void>()
}

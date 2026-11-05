import type { InputEvent } from "./InputEvent"

/** How long an action stays held before it repeats for the first time, in seconds. */
export const REPEAT_DELAY = 0.4

/** How long an action held keeps between two repetitions after the first, in seconds. */
export const REPEAT_INTERVAL = 0.08

/**
 * One time an action happened in a frame: its press, or a repetition while it stays held. The UI reads them
 * to navigate, so a stick or the cross of a gamepad repeats like an arrow key.
 */
export interface ActionOccurrence<B extends string> {
    readonly action: B

    /** The press that made it, none for a repetition, which no event of the frame made. */
    readonly event: InputEvent|null

    /** Has someone already handled it? */
    readonly consumed: boolean

    /** Mark it as handled, and its press with it, so the tables read after this one do not see the press. */
    consume(): void
}

/** An occurrence of a frame, reused from frame to frame. */
export class FrameOccurrence<B extends string> implements ActionOccurrence<B> {


    public consumed = false

    constructor(
        public action: B,
        public event: InputEvent|null,
    ){}


    public consume(): void {
        this.consumed = true
        this.event?.consume()
    }

    /** Make it a fresh occurrence of an action. */
    public reset(action: B, event: InputEvent|null): this {
        this.action = action
        this.event = event
        this.consumed = false
        return this
    }
}

/**
 * When each held action repeats next: {@link REPEAT_DELAY} after its press, then every
 * {@link REPEAT_INTERVAL}.
 */
export class Repeat<B extends string> {


    /** Start the repetition of an action just pressed. */
    public start(action: B, time: number): void {
        this.#nextAt.set(action, time + REPEAT_DELAY)
    }

    /** Stop the repetition of an action released. Stopping one that does not repeat does nothing. */
    public stop(action: B): void {
        this.#nextAt.delete(action)
    }

    /** Stop every repetition. */
    public clear(): void {
        this.#nextAt.clear()
    }

    /**
     * Does an action repeat in the frame at a time? It repeats once per frame at most, so a hitch does not
     * fire a burst of moves in a menu.
     */
    public isDue(action: B, time: number): boolean {
        const nextAt = this.#nextAt.get(action)
        if(nextAt === undefined || time < nextAt) return false
        // Behind by more than one interval after a hitch, the next repetition is counted from now.
        const behind = nextAt + REPEAT_INTERVAL <= time
        this.#nextAt.set(action, (behind ? time : nextAt) + REPEAT_INTERVAL)
        return true
    }


    /** The time each repeating action repeats next, in seconds. */
    readonly #nextAt = new Map<B, number>()
}

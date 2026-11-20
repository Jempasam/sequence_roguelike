/** What stops a wait before it ends. */
export interface Cancel {
    /** Stop the wait. Doing it twice, or after it ended, changes nothing. */
    cancel(): void
}

/**
 * Where time goes: what runs something after a while, and tells the time. The sessions of the network and
 * the deadlines of the game take one, so a test moves the time by hand and never waits for a real timer.
 */
export interface TimerPort {
    /** Run something once, after this many milliseconds. */
    after(ms: number, run: () => void): Cancel

    /** The time now, in milliseconds. */
    now(): number
}

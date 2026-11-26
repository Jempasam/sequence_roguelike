/** Something that moves on with time, from a start to an end. What it reads and draws in is its own. */
export interface Animation {

    /** Begin, once, before the first update. */
    start(): void

    /**
     * Move it on.
     *
     * @param dt - The time of the frame, in seconds.
     * @returns False once it is over.
     */
    update(dt: number): boolean

    /** Called once when it is over or cut short, to leave nothing behind. */
    end(): void
}

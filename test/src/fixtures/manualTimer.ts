import type { Cancel, TimerPort } from "@game/core-src/platform/TimerPort"

/** A timer whose time moves only when a test says so, and runs what is due as it moves. */
export class ManualTimer implements TimerPort {


    /** How many waits are still to run. */
    public get pending(): number { return this.#waits.filter(wait => !wait.isCancelled).length }

    public after(ms: number, run: () => void): Cancel {
        const wait = { due: this.#time + ms, run, isCancelled: false }
        this.#waits.push(wait)
        return { cancel: () => { wait.isCancelled = true } }
    }

    public now(): number { return this.#time }

    /** Move the time on, and run what falls due, in the order of its due times. */
    public advance(ms: number): void {
        this.#time += ms
        const due = this.#waits.filter(wait => !wait.isCancelled && wait.due <= this.#time)
        this.#waits = this.#waits.filter(wait => !due.includes(wait))
        for(const wait of due.sort((first, second) => first.due - second.due)) wait.run()
    }


    #time = 0
    #waits: { due: number, run: () => void, isCancelled: boolean }[] = []
}

import type { Cancel, TimerPort } from "../../platform"

/** A time that moves only when told to, for tests: nothing waits for a real timer. */
export class ManualScheduler implements TimerPort {


    public after(ms: number, run: () => void): Cancel {
        const entry = { at: this.#now + ms, run, cancelled: false }
        this.#entries.push(entry)
        return { cancel: () => { entry.cancelled = true } }
    }

    public now(): number {
        return this.#now
    }

    /** Move the time forward, running what comes due in the order it was due. */
    public advance(ms: number): void {
        const end = this.#now + ms
        for(;;){
            const due = this.#entries.filter(entry => !entry.cancelled && entry.at <= end)
            if(due.length === 0) break
            due.sort((a, b) => a.at - b.at)
            const [first] = due
            this.#entries.splice(this.#entries.indexOf(first), 1)
            this.#now = Math.max(this.#now, first.at)
            first.run()
        }
        this.#now = end
        this.#entries.splice(0, this.#entries.length, ...this.#entries.filter(entry => !entry.cancelled))
    }


    #now = 0
    readonly #entries: { at: number, run: () => void, cancelled: boolean }[] = []
}

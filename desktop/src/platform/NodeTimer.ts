import type { Cancel, TimerPort } from "@game/core"

/** The timers of Node: what core waits for a time with. */
export class NodeTimer implements TimerPort {


    after(ms: number, run: () => void): Cancel {
        const timer = setTimeout(run, ms)
        return { cancel: () => clearTimeout(timer) }
    }

    now(): number {
        return Date.now()
    }
}

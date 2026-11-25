// Runs node processes in parallel, at most as many threads as the machine has cores (ART_JOBS to set it), so the
// pictures, the paintings and the sounds of renderArt.ts are rendered at once instead of one after the other. A
// process that runs on several threads (the sounds) takes as many places as it has threads, so there are never more
// threads than cores.

import { execFile } from "node:child_process"
import { availableParallelism } from "node:os"

/** How many threads run at the same time. */
export const LIMIT = Math.max(1, Number(process.env.ART_JOBS) || availableParallelism())

interface Waiting { readonly places: number, readonly resolve: () => void }

const waiting: Waiting[] = []
let running = 0

/** Wait for free places, and take them. Those who wait are served in the order they came. */
async function take(places: number): Promise<void> {
    if(waiting.length === 0 && running + places <= LIMIT) running += places
    else await new Promise<void>(resolve => waiting.push({ places, resolve }))
}

/** Give the places back, to whoever waits for them first. */
function release(places: number): void {
    running -= places
    while(waiting.length > 0 && running + waiting[0].places <= LIMIT){
        const next = waiting.shift()!
        running += next.places
        next.resolve()
    }
}

/**
 * Run a script with node, once the places are free, and wait for its end.
 * @param args - The script and its arguments.
 * @param places - How many threads the process uses, at most `LIMIT`.
 * @returns What the process wrote on its output.
 * @throws When the process fails: the message holds what it wrote on its error output.
 */
export async function runNode(args: readonly string[], places = 1): Promise<string> {
    const taken = Math.min(places, LIMIT)
    await take(taken)
    try {
        return await new Promise<string>((resolve, reject) => {
            execFile(process.execPath, args, { maxBuffer: 64 * 1024 * 1024 }, (error, out, errors) => {
                if(error === null) resolve(out)
                else reject(new Error(errors.trim() || error.message))
            })
        })
    } finally {
        release(taken)
    }
}

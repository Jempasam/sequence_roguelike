import { parentPort, workerData } from "node:worker_threads"

import { playSlice } from "./cells"
import type { Slice } from "./cells"
import { planOf } from "./options"

// The thread of a pool of workers: it reads the command line again, which gives it the same plan as the
// thread that started it, then plays the slices of cells it is sent.

const port = parentPort
if(port === null) throw new Error("worker.ts is run as a worker thread, by the pool of the run.")

const plan = await planOf(workerData as readonly string[])

port.on("message", (slice: Slice) => {
    try {
        port.postMessage({ result: playSlice(plan, slice) })
    }
    catch(error){
        port.postMessage({ error: error instanceof Error ? error.message : String(error) })
    }
})

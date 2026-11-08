import { parentPort, workerData } from "node:worker_threads"

import { playCell } from "./cells"
import type { CellId } from "./cells"
import { planOf } from "./options"

// The thread of a pool of workers: it reads the command line again, which gives it the same plan as the
// thread that started it, then plays the cells it is sent.

const port = parentPort
if(port === null) throw new Error("worker.ts is run as a worker thread, by the pool of the run.")

const plan = await planOf(workerData as readonly string[])

port.on("message", (cell: CellId) => {
    try {
        port.postMessage({ result: playCell(plan, cell) })
    }
    catch(error){
        port.postMessage({ error: error instanceof Error ? error.message : String(error) })
    }
})

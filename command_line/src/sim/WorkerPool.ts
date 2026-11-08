import { Worker } from "node:worker_threads"

import type { CellId, CellResult } from "./cells"

/** What a worker thread answers to a cell: the result, or what stopped it. */
type Answer = { readonly result: CellResult }|{ readonly error: string }

/** A cell waiting for a free worker, and how to answer whoever asked. */
interface Job {
    readonly cell: CellId
    readonly resolve: (result: CellResult) => void
    readonly reject: (error: Error) => void
}

/**
 * Threads that play the cells of a plan, one cell at a time each.
 *
 * @remarks
 * Every thread reads the command line again to get the plan, since a plan holds functions that cannot be sent
 * between threads. A battle depends on its seed alone, so a cell gives the same result on any thread, and the
 * table does not depend on how many there are.
 */
export class WorkerPool {


    /**
     * @param args - The command line of the run, which each thread reads again.
     * @param size - How many threads to start.
     */
    constructor(args: readonly string[], size: number){
        for(let index = 0; index < size; index++) this.#start(args)
    }


    /** Play a cell on the first thread free. */
    public run(cell: CellId): Promise<CellResult> {
        return new Promise((resolve, reject) => {
            const job: Job = { cell, resolve, reject }
            const idle = this.#idle.pop()
            if(idle) this.#send(idle, job)
            else this.#waiting.push(job)
        })
    }

    /** Stop every thread, a cell still being played given up. */
    public async close(): Promise<void> {
        await Promise.all(this.#workers.map(worker => worker.terminate()))
    }


    readonly #workers: Worker[] = []

    /** The threads with nothing to play. */
    readonly #idle: Worker[] = []

    /** The cells no thread has taken yet, in the order asked. */
    readonly #waiting: Job[] = []

    /** What each busy thread is playing. */
    readonly #playing = new Map<Worker, Job>()

    #start(args: readonly string[]): void {
        const worker = new Worker(WorkerPool.#entry(), { eval: true, workerData: args })
        worker.on("message", (answer: Answer) => this.#answered(worker, answer))
        worker.on("error", error => this.#failed(worker, error))
        this.#workers.push(worker)
        this.#idle.push(worker)
    }

    #send(worker: Worker, job: Job): void {
        this.#playing.set(worker, job)
        worker.postMessage(job.cell)
    }

    #answered(worker: Worker, answer: Answer): void {
        const job = this.#playing.get(worker)
        this.#playing.delete(worker)
        if(job) {
            if("error" in answer) job.reject(new Error(answer.error))
            else job.resolve(answer.result)
        }
        const next = this.#waiting.shift()
        if(next) this.#send(worker, next)
        else this.#idle.push(worker)
    }

    /** A thread that threw is lost: the cell it was playing, and every cell waiting, fail with its error. */
    #failed(worker: Worker, error: Error): void {
        this.#playing.get(worker)?.reject(error)
        this.#playing.delete(worker)
        for(const job of this.#waiting.splice(0)) job.reject(error)
    }

    /**
     * What a thread runs first: it registers `tsx`, then loads `worker.ts`. A worker does not read TypeScript
     * by itself, and the hooks `tsx` registered in this process do not reach it, so it would not find the
     * modules imported without their extension. `--import tsx` in its options did not give it the hooks.
     */
    static #entry(): string {
        const api = import.meta.resolve("tsx/esm/api")
        const worker = new URL("./worker.ts", import.meta.url).href
        return `
            const { register } = await import(${JSON.stringify(api)})
            register()
            await import(${JSON.stringify(worker)})
        `
    }
}

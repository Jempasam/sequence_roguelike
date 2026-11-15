import { availableParallelism } from "node:os"
import { createInterface } from "node:readline/promises"

import { playCell } from "./cells"
import type { CellId, CellResult, Slice } from "./cells"
import type { Plan } from "./options"
import type { Matrix } from "./report"
import { mergeTallies } from "./stats"
import { WorkerPool } from "./WorkerPool"

/** Above this many battles, a run asks before it starts. */
const CONFIRM_ABOVE = 20_000

/** Above this many battles, a run tells how many it is going to play. */
const ANNOUNCE_ABOVE = 1_000

/**
 * Above this many battles, `--jobs auto` plays them on several threads. Starting a thread takes a second or
 * two, which a small run would not win back.
 */
const PARALLEL_ABOVE = 100

/** Where a run writes what is not its table: its progress, its warnings. */
export interface Console {
    error(message: string): void

    /** Ask a yes or no question, no when there is nobody to ask. */
    confirm(question: string): Promise<boolean>

    /** Is somebody watching the progress? */
    readonly interactive: boolean
}

export const SYSTEM_CONSOLE: Console = {
    error: message => process.stderr.write(`${message}\n`),
    interactive: Boolean(process.stderr.isTTY),
    async confirm(question){
        if(!process.stdin.isTTY) return true
        const lines = createInterface({ input: process.stdin, output: process.stderr })
        try {
            return /^(o|oui|y|yes)$/i.test((await lines.question(`${question} [o/N] `)).trim())
        }
        finally {
            lines.close()
        }
    },
}

/** What a run gives: a table for each AI, and what went wrong in the battles. */
export interface RunResult {
    readonly matrices: Matrix[]

    /** The effects that failed, each message once with how many times it happened. */
    readonly failures: Map<string, number>

    /** Did the user refuse to play as many battles? */
    readonly cancelled: boolean

    /** The journal of every battle, in the order of the tables, for `--log`: empty without it. */
    readonly logs: readonly (readonly string[])[]
}

/** Above this many battles, `--log` warns that its file will be big. */
const LOG_WARN_ABOVE = 50

/** Every cell the plan asks for, in the order of the tables: by AI, by row. */
function cellsOf(plan: Plan): CellId[] {
    const cells: CellId[] = []
    plan.variants.forEach((_, variant) => {
        plan.rows.forEach((__, row) => cells.push({ variant, row }))
    })
    return cells
}

/** How many threads play the battles: those asked for, or by the size of the run, at most one per battle. */
function threadsFor(plan: Plan, battles: number): number {
    const wanted = plan.jobs === "auto" ? (battles > PARALLEL_ABOVE ? availableParallelism() : 1) : plan.jobs
    return Math.max(1, Math.min(wanted, battles))
}

/** Each thread is given about this many slices, so that the last battles do not leave most threads idle. */
const SLICES_PER_THREAD = 3

/**
 * The battles of a cell cut into slices, so that a few cells still keep every thread busy: a cell is not
 * played by one thread from its first battle to its last.
 */
function slicesOf(plan: Plan, id: CellId, cells: number, threads: number): Slice[] {
    const parts = Math.max(1, Math.min(plan.games, Math.ceil(threads * SLICES_PER_THREAD / cells)))
    const size = Math.ceil(plan.games / parts)
    const slices: Slice[] = []
    for(let from = 0; from < plan.games; from += size) slices.push({ ...id, from, to: Math.min(from + size, plan.games) })
    return slices
}

/** The slices of a cell gathered back into the cell, in the order of the battles. */
function gather(parts: readonly CellResult[]): CellResult {
    const failures = new Map<string, number>()
    for(const part of parts) for(const [message, count] of part.failures) failures.set(message, (failures.get(message) ?? 0) + count)
    return {
        tally: mergeTallies(parts.map(part => part.tally)),
        failures: [...failures],
        logs: parts.flatMap(part => part.logs),
    }
}

/**
 * Play every battle the plan asks for and gather them into one table for each AI.
 *
 * @returns The tables, and the effects that failed, each message once with how many times it happened.
 */
export async function run(plan: Plan, io: Console): Promise<RunResult> {
    const ids = cellsOf(plan)
    const total = ids.length * plan.games
    if(!plan.quiet && total > ANNOUNCE_ABOVE) io.error(`sim : ${total.toLocaleString("fr-FR")} combats à jouer.`)
    if(!plan.quiet && total > CONFIRM_ABOVE && !await io.confirm(`Jouer ${total.toLocaleString("fr-FR")} combats ?`)){
        return { matrices: [], failures: new Map(), cancelled: true, logs: [] }
    }
    if(!plan.quiet && plan.log !== null && total > LOG_WARN_ABOVE){
        io.error(`sim : --log écrit ${total.toLocaleString("fr-FR")} combats en entier : le fichier sera gros (réduire --games, --of ou --out).`)
    }

    const started = Date.now()
    let done = 0
    // The last tenth of the run told, so each 10 % is told once, as a line, whether anybody watches or not.
    let toldTenth = 0
    const played = (battles: number): void => {
        done += battles
        if(plan.quiet) return
        const tenth = Math.floor(done * 10 / total)
        if(tenth <= toldTenth) return
        toldTenth = tenth
        const seconds = ((Date.now() - started) / 1000).toFixed(1)
        io.error(`sim : ${tenth * 10} % (${done.toLocaleString("fr-FR")}/${total.toLocaleString("fr-FR")} combats, ${seconds} s)`)
    }
    const results: CellResult[] = new Array<CellResult>(ids.length)
    const threads = threadsFor(plan, total)
    if(threads > 1){
        const pool = new WorkerPool(plan.args, threads)
        try {
            await Promise.all(ids.map(async(id, index) => {
                const parts = await Promise.all(slicesOf(plan, id, ids.length, threads).map(async slice => {
                    const part = await pool.run(slice)
                    played(slice.to - slice.from)
                    return part
                }))
                results[index] = gather(parts)
            }))
        }
        finally {
            await pool.close()
        }
    }
    else {
        ids.forEach((id, index) => {
            results[index] = playCell(plan, id)
            played(plan.games)
        })
    }

    const failures = new Map<string, number>()
    for(const { failures: found } of results) for(const [message, count] of found) {
        failures.set(message, (failures.get(message) ?? 0) + count)
    }
    const matrices: Matrix[] = plan.variants.map((variant, at) => ({
        title: plan.variants.length > 1 ? `IA : ${variant.name}` : null,
        rows: plan.rows.map(row => row.label),
        tallies: plan.rows.map((_, row) => results[at * plan.rows.length + row].tally),
    }))
    if(!plan.quiet){
        const seconds = ((Date.now() - started) / 1000).toFixed(1)
        if(total > ANNOUNCE_ABOVE) {
            const on = threads > 1 ? ` sur ${threads} threads` : ""
            io.error(`sim : ${done.toLocaleString("fr-FR")} combats en ${seconds} s${on}.`)
        }
    }
    return { matrices, failures, cancelled: false, logs: results.flatMap(result => result.logs) }
}

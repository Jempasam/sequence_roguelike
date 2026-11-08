import { availableParallelism } from "node:os"
import { createInterface } from "node:readline/promises"

import { applies, distinctAtoms, playCell } from "./cells"
import type { CellId, CellResult } from "./cells"
import type { Plan } from "./options"
import type { Matrix } from "./report"
import { mergeTallies } from "./stats"
import type { Tally } from "./stats"
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
}

/** Every cell the plan asks for, in the order of the tables: by AI, by subject, by kind of battle. */
function cellsOf(plan: Plan): CellId[] {
    const atoms = distinctAtoms(plan)
    const cells: CellId[] = []
    plan.variants.forEach((_, variant) => {
        plan.subjects.forEach((subject, index) => {
            atoms.forEach((atom, at) => {
                if(applies(subject, atom)) cells.push({ variant, subject: index, atom: at })
            })
        })
    })
    return cells
}

/** How many threads play the battles: those asked for, or by the size of the run, at most one per cell. */
function threadsFor(plan: Plan, cells: number, battles: number): number {
    const wanted = plan.jobs === "auto" ? (battles > PARALLEL_ABOVE ? availableParallelism() : 1) : plan.jobs
    return Math.max(1, Math.min(wanted, cells))
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
        return { matrices: [], failures: new Map(), cancelled: true }
    }

    const started = Date.now()
    let done = 0
    const played = (): void => {
        done += plan.games
        if(!plan.quiet && io.interactive) process.stderr.write(`\r  ${done}/${total} combats`)
    }
    const results: CellResult[] = new Array<CellResult>(ids.length)
    const threads = threadsFor(plan, ids.length, total)
    if(threads > 1){
        const pool = new WorkerPool(plan.args, threads)
        try {
            await Promise.all(ids.map(async(id, index) => {
                results[index] = await pool.run(id)
                played()
            }))
        }
        finally {
            await pool.close()
        }
    }
    else {
        ids.forEach((id, index) => {
            results[index] = playCell(plan, id)
            played()
        })
    }

    const failures = new Map<string, number>()
    for(const { failures: found } of results) for(const [message, count] of found) {
        failures.set(message, (failures.get(message) ?? 0) + count)
    }
    const atoms = distinctAtoms(plan)
    const matrices: Matrix[] = []
    let next = 0
    for(const variant of plan.variants){
        const rows: string[] = []
        const table: (Tally|null)[][] = []
        for(const subject of plan.subjects){
            const tallies = new Map<string, Tally|null>()
            for(const atom of atoms){
                tallies.set(atom.key, applies(subject, atom) ? results[next++].tally : null)
            }
            rows.push(subject.name)
            table.push(plan.columns.map(column => {
                if(column.total){
                    const seen = [...tallies.values()].filter((tally): tally is Tally => tally !== null)
                    return seen.length === 0 ? null : mergeTallies(seen)
                }
                const own = column.atoms.map(atom => tallies.get(atom.key) ?? null)
                if(own.some(tally => tally === null)) return null
                return mergeTallies(own as Tally[])
            }))
        }
        matrices.push({
            title: plan.variants.length > 1 ? `IA : ${variant.name}` : null,
            rows,
            columns: plan.columns.map(column => column.label),
            cells: table,
        })
    }
    if(!plan.quiet){
        if(io.interactive) process.stderr.write("\r")
        const seconds = ((Date.now() - started) / 1000).toFixed(1)
        if(total > ANNOUNCE_ABOVE) {
            const on = threads > 1 ? ` sur ${threads} threads` : ""
            io.error(`sim : ${done.toLocaleString("fr-FR")} combats en ${seconds} s${on}.`)
        }
    }
    return { matrices, failures, cancelled: false }
}

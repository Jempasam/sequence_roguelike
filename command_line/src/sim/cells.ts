import type { Plan } from "./options"
import { playGame } from "./scenario"
import { addBattle, emptyTally } from "./stats"
import type { Tally } from "./stats"

/** Which cell of a plan: the AI and the row, each by its place in the plan. */
export interface CellId {
    readonly variant: number
    readonly row: number
}

/** What the battles of a cell gave. */
export interface CellResult {
    readonly tally: Tally

    /** The effects that failed in these battles, each message with how many times it happened. */
    readonly failures: readonly (readonly [string, number])[]

    /** The journal of each battle, in the order played, for `--log`: none without it. */
    readonly logs: readonly (readonly string[])[]
}

/** Play every battle of a cell. */
export function playCell(plan: Plan, cell: CellId): CellResult {
    return playSlice(plan, { ...cell, from: 0, to: plan.games })
}

/** A run of the battles of a cell, by their numbers: from `from` included to `to` excluded. */
export interface Slice extends CellId {
    readonly from: number
    readonly to: number
}

/**
 * Play some of the battles of a cell. A battle depends on its number alone, so the slices of a cell,
 * gathered, give what the cell gives whole.
 */
export function playSlice(plan: Plan, slice: Slice): CellResult {
    const variant = plan.variants[slice.variant]
    const row = plan.rows[slice.row]
    const tally = emptyTally()
    const failures = new Map<string, number>()
    const logs: (readonly string[])[] = []
    for(let game = slice.from; game < slice.to; game++){
        const result = playGame(row, game, variant.name, variant.setup)
        addBattle(tally, result.outcome, result.rounds, result.errors.length, result.soft)
        for(const message of result.errors) failures.set(message, (failures.get(message) ?? 0) + 1)
        if(result.log) logs.push(result.log)
    }
    return { tally, failures: [...failures], logs }
}

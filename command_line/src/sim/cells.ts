import { sameFighter } from "./fighters"
import type { Fighter } from "./fighters"
import type { Plan } from "./options"
import type { Atom } from "./outputs"
import { playGame } from "./scenario"
import { addBattle, emptyTally } from "./stats"
import type { Tally } from "./stats"

/** Which cell of a plan: the AI, the subject and the kind of battle, each by its place in the plan. */
export interface CellId {
    readonly variant: number
    readonly subject: number
    readonly atom: number
}

/** What the battles of a cell gave. */
export interface CellResult {
    readonly tally: Tally

    /** The effects that failed in these battles, each message with how many times it happened. */
    readonly failures: readonly (readonly [string, number])[]
}

const ATOMS = new WeakMap<Plan, readonly Atom[]>()

/** The kinds of battle of the table, those the columns pool counted once. */
export function distinctAtoms(plan: Plan): readonly Atom[] {
    const known = ATOMS.get(plan)
    if(known) return known
    const atoms = new Map<string, Atom>()
    for(const column of plan.columns) for(const atom of column.atoms) atoms.set(atom.key, atom)
    const found = [...atoms.values()]
    ATOMS.set(plan, found)
    return found
}

/** Does a cell make sense for a subject? Not a team naming the subject as its own partner. */
export function applies(subject: Fighter, atom: Atom): boolean {
    return atom.team.kind !== "with" || !atom.team.partners.some(partner => sameFighter(partner, subject))
}

/** Play every battle of a cell. */
export function playCell(plan: Plan, cell: CellId): CellResult {
    const variant = plan.variants[cell.variant]
    const subject = plan.subjects[cell.subject]
    const atom = distinctAtoms(plan)[cell.atom]
    const tally = emptyTally()
    const failures = new Map<string, number>()
    for(let game = 0; game < plan.games; game++){
        const result = playGame(subject, atom, game, variant.name, variant.setup)
        addBattle(tally, result.outcome, result.rounds, result.errors.length, result.soft)
        for(const message of result.errors) failures.set(message, (failures.get(message) ?? 0) + 1)
    }
    return { tally, failures: [...failures] }
}

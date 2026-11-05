import type { SavedCard } from "../../sim/save/battleSave"

/** What a unit is to play this round, as a save writes it down. */
export interface UnitPlan {
    /** The unit, by its name. */
    readonly unit: string

    /** The cards of its chain, in order. */
    readonly cards: readonly SavedCard[]

    /** What it uses at the start of the execution, each by its place in its belt. */
    readonly usables: readonly number[]
}

/** What a client gives the host once it is ready: the plans of the units it plays. */
export interface PlanMessage {
    /** The round it is for, so a late one is told from a new one. */
    readonly round: number

    readonly plans: readonly UnitPlan[]
}

/** A message as sent. */
export function writePlanMessage(message: PlanMessage): string {
    return JSON.stringify(message)
}

/**
 * A message as received.
 *
 * @throws {@link Error} When it is no message of a plan.
 */
export function readPlanMessage(text: string): PlanMessage {
    const message = JSON.parse(text) as Partial<PlanMessage>|null
    const isMessage = typeof message === "object" && message !== null
        && typeof message.round === "number" && Array.isArray(message.plans)
    if(!isMessage) throw new Error("A message of the plans came in another shape: is the other client up to date?")
    return message as PlanMessage
}

import type { SavedCard } from "../../sim/save/battleSave"

import { PLAN_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

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

/** A message as received, or why it cannot be read. */
export function readPlanMessage(text: string): PlanMessage|UnreadableFault {
    const message = readJson(PLAN_TOPIC.name, text) as Partial<PlanMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isMessage = typeof message === "object" && message !== null
        && typeof message.round === "number" && Array.isArray(message.plans)
    if(!isMessage) return wrongShape(PLAN_TOPIC.name, text, "message of the plans")
    return message as PlanMessage
}

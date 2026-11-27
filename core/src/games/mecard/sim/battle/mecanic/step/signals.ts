import { SignalKey, TriggerKey } from "../../ObserverMap"
import type { Action } from "../../Action"
import type { Unit } from "../../Unit"

/** A step of a unit about to start, nothing of it read yet: the listeners say what becomes of it. */
export interface IncomingStep {
    readonly unit: Unit

    /** Why the unit lets the step go by, a reason for each listener asking: it plays when there is none. */
    readonly skipped: string[]

    /** What turns the action read into the one played, applied in order. */
    readonly changes: ((action: Action) => Action)[]
}

/** The places of the first and the last card of a tree of a chain. */
export interface CardRange {
    readonly first: number
    readonly last: number
}

/** A step of a unit was disabled. */
export interface DisabledStep {
    readonly unit: Unit

    /** The cards it came from, none when it was ready already, its cards read before. */
    readonly cards: CardRange|null
}

/** How many steps a unit has left this round. */
export interface StepsCount {
    readonly unit: Unit
    readonly left: number
}

/** A step of a unit is about to start, told on that unit after it is told starting. */
export const INCOMING_STEP = new TriggerKey<IncomingStep>("incoming step")

/** A step was disabled: it will never play. */
export const STEP_DISABLED = new SignalKey<DisabledStep>("step disabled")

/** The number of steps a unit has left changed, other than by playing the next one. */
export const STEPS_CHANGED = new SignalKey<StepsCount>("steps changed")

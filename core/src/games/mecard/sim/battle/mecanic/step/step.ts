import { rgba } from "../../../base/Rgba"
import type { Card } from "../../../card/Card"
import { CardChain } from "../../../card/CardChain"
import { ACTION } from "../../../card/CardType"
import type { Action } from "../../Action"
import type { Battle } from "../../Battle"
import { labelEffect } from "../../effects"
import type { Unit } from "../../Unit"

import { INCOMING_STEP, STEP_DISABLED, STEPS_CHANGED } from "./signals"
import type { IncomingStep } from "./signals"

/** How long a unit doing nothing shows why, in seconds. */
const IDLE_TIME = 0.3

/** The color it says why in. */
const IDLE_COLOR = rgba(0.75, 0.75, 0.85)

/** What comes with steps added to those of a unit. */
export interface Added {
    /** The cards they come from, put in the chain where its reading stands, and lit. */
    readonly cards?: readonly Card[]

    /** The word said of the unit. */
    readonly word?: string
}

/** An action doing nothing for a moment, but saying why. */
export function idle(reason: string): Action {
    return {
        use: ({ battle, unit }) => {
            battle.events.push({ type: "skipped", unit, reason })
            battle.post(labelEffect(unit.position, reason, IDLE_COLOR, IDLE_TIME))
        },
        preview: ({ pose }) => ({
            indicators: [{ kind: "label", at: pose.position, text: reason, color: IDLE_COLOR }],
            pose,
        }),
    }
}

/** Have the step about to start go by: nothing of it is read. Asked twice, one step goes by all the same. */
export function skip(incoming: IncomingStep, reason: string): void {
    incoming.skipped.push(reason)
}

/**
 * Start the next step of a unit: its listeners hear of it, then it is read, unless one has it go by.
 *
 * @returns What plays it, none when the unit has nothing to play, or died of being told.
 */
export function next(battle: Battle, unit: Unit): Action|null {
    const observer = unit.observers.of(INCOMING_STEP)
    // Counted first: a listener may leave as it hears.
    const heard = observer.size > 0
    const incoming: IncomingStep = { unit, skipped: [], changes: [] }
    observer.notify(incoming)
    if(!unit.alive) return null
    const action = incoming.skipped.length > 0 ? idle(incoming.skipped.join(", ")) : read(unit, incoming)
    // Whoever listens may have kept the step, or disabled another.
    if(heard) tellCount(battle, unit)
    return action
}

/**
 * Disable the next steps of a unit not played yet, those ready first, then those of its chain: they never
 * play.
 *
 * @param count - How many it disables at most.
 * @param word - The word said of the unit when any is.
 * @returns How many it disabled.
 */
export function disable(battle: Battle, unit: Unit, count = 1, word?: string): number {
    if(!unit.alive) return 0
    let disabled = 0
    while(disabled < count){
        const gone = unit.discardStep()
        if(!gone) break
        disabled++
        battle.observers.of(STEP_DISABLED).notify({ unit, cards: gone.cards })
    }
    if(disabled === 0) return 0
    if(word !== undefined) battle.events.push({ type: "status", unit, text: word })
    tellCount(battle, unit)
    return disabled
}

/** Have a unit play actions next, in order, before what it has left. Nothing for a dead one. */
export function insert(battle: Battle, unit: Unit, actions: readonly Action[], added: Added = {}): void {
    if(!unit.alive || actions.length === 0) return
    unit.queueNext(actions)
    tellAdded(battle, unit, added)
}

/**
 * Have a unit play actions after the steps it has ready, in order: before what its chain has left to give.
 * Nothing for a dead one.
 */
export function append(battle: Battle, unit: Unit, actions: readonly Action[], added: Added = {}): void {
    if(!unit.alive || actions.length === 0) return
    unit.queueLast(actions)
    tellAdded(battle, unit, added)
}

/**
 * Make a unit play again the last tree of its chain it started: a copy of its cards is put in its chain,
 * and the action they give is queued after what the unit has ready.
 *
 * @returns Did it have one to play again?
 */
export function repeat(battle: Battle, unit: Unit): boolean {
    if(!unit.alive || unit.lastTree.length === 0) return false
    const cards = [...unit.lastTree]
    const action = new CardChain([...cards]).next(ACTION)
    if(!action) return false
    append(battle, unit, [action], { cards, word: "bégaie" })
    return true
}

/**
 * Play the last step of a unit once more, at the end: its chain is read to its end first. For after the
 * preparation, before the execution.
 */
export function doubleLast(battle: Battle, unit: Unit): void {
    unit.readChain()
    const last = unit.steps[unit.steps.length - 1]
    if(last) append(battle, unit, [last], { word: "dernière étape doublée" })
}

/** Read the next step of a unit, changed as its listeners asked. */
function read(unit: Unit, incoming: IncomingStep): Action|null {
    const own = unit.takeStep()
    return own && incoming.changes.reduce((action, change) => change(action), own)
}

/** Put the cards of steps added in the chain, say their word, and tell how many are left. */
function tellAdded(battle: Battle, unit: Unit, { cards = [], word }: Added): void {
    if(cards.length > 0){
        const at = unit.chain.insert(unit.chain.cursor, cards)
        unit.chain.watcher?.activated(at, at + cards.length - 1)
    }
    if(word !== undefined) battle.events.push({ type: "status", unit, text: word })
    tellCount(battle, unit)
}

function tellCount(battle: Battle, unit: Unit): void {
    battle.observers.of(STEPS_CHANGED).notify({ unit, left: unit.stepsLeft })
}

import type { Battle } from "../battle/Battle"
import type { Team } from "../battle/Team"
import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import type { CardChain } from "../card/CardChain"

import { DeckAi } from "./Bot"
import { SECRET_CARD } from "../card/subs/SecretCard"
import { loadBattle, saveBattle, savedCard } from "../save/battleSave"

import { loadPlan, savePlan } from "./PredictingController"
import type { PredictionMemo } from "./PredictingController"
import { planIn, ROOT_DEPTH } from "./UnitController"
import type { BattlePlan } from "./UnitController"

/** What guesses a unit to play its hand from left to right, when its own AI cannot be asked. */
const DECK = new DeckAi()

/** The cards a lookahead may play of some: all but the secret card, which it never plays. */
export function known(cards: readonly Card[]): Card[] {
    return cards.filter(card => card !== SECRET_CARD)
}

/** The cards of a unit it may play this round: its hand, and what it committed already, the secret card left out. */
export function available(unit: Unit, battle: Battle): Card[] {
    return known([...unit.hand, ...battle.planOf(unit)?.cards ?? []])
}

/**
 * A copy of a view whose draw piles and discards, of every unit, hold only the secret card, as many as
 * they held: what a lookahead tries plays the cards in hand only, never what it would draw.
 */
export function withoutDecks(view: Battle, unit: Unit): { view: Battle, unit: Unit } {
    const save = saveBattle(view)
    const secret = savedCard(SECRET_CARD)
    const hidden = {
        ...save,
        units: save.units.map(each => ({
            ...each,
            decks: each.decks.map(deck => ({
                pile: deck.pile.map(() => secret),
                discard: deck.discard.map(() => secret),
            })),
        })),
    }
    const copy = loadBattle(hidden)
    // A save writes a player or a bot: the AIs of the units are kept, as a clone keeps them, so the others
    // are still guessed by their own AI.
    copy.bot = view.bot
    view.units.forEach((each, index) => { copy.units[index].controller = each.controller })
    return { view: copy, unit: copy.units[view.units.indexOf(unit)] }
}

/**
 * Decide, as the root, on the view itself or, with `hidden`, on a copy of it without decks, see
 * {@link withoutDecks}: the plan is then said again with the cards and usables of the view.
 */
export function decideRoot(
    view: Battle, unit: Unit, hidden: boolean, decide: (view: Battle, unit: Unit) => BattlePlan,
): BattlePlan {
    if(!hidden) return decide(view, unit)
    const blind = withoutDecks(view, unit)
    return loadPlan(view, unit, savePlan(blind.unit, decide(blind.view, blind.unit)))
}

/** What a battle gives a team now: its life left against the others', a win or a loss weighing a lot. */
export function score(battle: Battle, team: Team): number {
    let total = 0
    for(const unit of battle.units) if(unit.decisive) total += (unit.team === team ? 1 : -1) * unit.life
    if(battle.phase === "over") total += battle.winner === team ? 1000 : battle.winner === null ? 0 : -1000
    return total
}

/**
 * How close a unit stands to the line in front of another: 0 behind it, else `1 / (1 + d)`, `d` its distance
 * in meters to the half-line starting from `from` the way it faces. 1 right in front.
 */
export function lineCloseness(from: Unit, to: Unit): number {
    const facing = from.direction.normalized
    if(!facing) return 0
    const offset = to.position.minus(from.position)
    const along = offset.dot(facing)
    if(along <= 0) return 0
    return 1 / (1 + offset.minus(facing.times(along)).length)
}

/** How the scores of a chain against each group of guesses make one: their mean, the worst, or the best. */
export type Combination = "mean"|"safe"|"unsafe"

/** The scores of a chain against each group of guesses, made one: weighted for the mean, the weights left aside otherwise. */
export function combine(how: Combination, scores: readonly { readonly value: number, readonly weight: number }[]): number {
    if(how === "safe") return Math.min(...scores.map(each => each.value))
    if(how === "unsafe") return Math.max(...scores.map(each => each.value))
    const weights = scores.reduce((sum, each) => sum + each.weight, 0)
    return scores.reduce((sum, each) => sum + each.value * each.weight, 0) / weights
}

/** The positions in a list of the cards a chain holds, each position used once. */
export function positionsOf(cards: readonly Card[], chain: CardChain): number[] {
    const used = new Set<number>()
    return chain.cards.map(card => {
        const at = cards.findIndex((each, index) => each === card && !used.has(index))
        used.add(at)
        return at
    })
}

/** What the other units of a view are guessed to do, by the index of the unit. */
export type OtherPlans = ReadonlyMap<number, BattlePlan>

/**
 * What the other units of a view, those with no chain yet, are guessed to do at `level`, read from `memo`:
 * at level 0 by its leaf, above by their AI given `level - 1`, see {@link PredictionMemo}. It is asked
 * once, before our chain is committed, so the others decide as we do, not knowing what we chose. A unit
 * whose guess fails, as when the battle cannot be copied while a process goes on, plays its hand from left
 * to right.
 */
export function guessOthers(view: Battle, mine: Unit, level: number, memo: PredictionMemo): OtherPlans {
    const plans = new Map<number, BattlePlan>()
    for(const other of view.initiative) {
        if(other === mine || view.planOf(other)) continue
        let plan: BattlePlan|null = null
        try {
            plan = memo.planOf(view, other, level)
        }
        catch {
            // A battle is not copied while a process goes on: the unit is guessed to play its hand.
        }
        plans.set(view.units.indexOf(other), plan ?? { chain: DECK.decide(other).chain })
    }
    return plans
}

/** The guesses of some levels that are the same, played once and weighing as many levels as they stand for. */
export interface GuessGroup {
    readonly plans: OtherPlans

    /** The levels that guess this, from the shallowest. */
    readonly levels: readonly number[]

    /** How many levels guess this. */
    readonly weight: number

    /** Does it stand for the deepest level asked? Its battle tried is the one tracked. */
    readonly deepest: boolean
}

/** What tells two guesses apart: each unit by its index, its cards as saved, its usables by their place. */
export function guessKey(view: Battle, plans: OtherPlans): string {
    return [...plans].map(([index, plan]) => {
        const { cards, usables } = savePlan(view.units[index], plan)
        return `${index}:${JSON.stringify(cards)}/${usables.join(",")}`
    }).join(";")
}

/**
 * The other units guessed at each of `levels`, the levels that guess the same put together: a battle tried
 * against a group plays as it would against each of its levels, the save holding the random draws, so it is
 * played once and weighs its levels.
 */
export function guessLevels(view: Battle, mine: Unit, levels: readonly number[], memo: PredictionMemo): GuessGroup[] {
    const deepest = Math.max(...levels)
    const groups = new Map<string, { plans: OtherPlans, levels: number[], weight: number, deepest: boolean }>()
    for(const level of levels) {
        const plans = guessOthers(view, mine, level, memo)
        const key = guessKey(view, plans)
        const group = groups.get(key)
        if(group) {
            group.levels.push(level)
            group.weight++
            group.deepest ||= level === deepest
        }
        else groups.set(key, { plans, levels: [level], weight: 1, deepest: level === deepest })
    }
    return [...groups.values()]
}

/**
 * The levels a lookahead averages over: at the root, `depths` (its own depth when not told), each kept at
 * most its own depth; asked by another AI, only the depth it is given.
 */
export function levelsOf(given: number, own: number, depths: readonly number[]|undefined): number[] {
    if(given !== ROOT_DEPTH) return [given]
    const levels = new Set((depths ?? [own]).map(each => Math.max(0, Math.min(each, own))))
    return [...levels].sort((first, second) => first - second)
}

/**
 * Commit, in a copy of the view the plans were guessed in, what the other units are guessed to do.
 */
export function commitOthers(copy: Battle, view: Battle, plans: OtherPlans): void {
    for(const [index, plan] of plans) {
        const other = copy.units[index]
        let said: BattlePlan
        try {
            said = planIn(copy, other, view.units[index], plan)
        }
        catch {
            said = { chain: DECK.decide(other).chain }
        }
        copy.commitPlan(other, said)
    }
}

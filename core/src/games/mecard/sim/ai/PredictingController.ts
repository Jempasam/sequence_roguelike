import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import { CardChain } from "../card/CardChain"
import { cardsInHand, savedCard } from "../save/battleSave"
import type { SavedCard } from "../save/battleSave"

import { askAi, viewFor } from "./UnitController"
import type { BattlePlan, UnitController } from "./UnitController"

/**
 * An AI that guesses what the other units do, and may read and write its guesses in a memo shared by every
 * AI asked under the same root decision, so that a unit guessed at a level is guessed once.
 */
export interface PredictingController extends UnitController {
    /**
     * As {@link UnitController.decide}, with `depth` levels it may still call, the other units guessed by
     * `memo`: what is guessed there was maybe decided along another path of the root decision.
     */
    decideWith(unit: Unit, view: Battle, depth: number, memo: PredictionMemo): BattlePlan
}

/** Does an AI guess the other units through a {@link PredictionMemo}? */
export function isPredicting(controller: UnitController): controller is PredictingController {
    return typeof (controller as Partial<PredictingController>).decideWith === "function"
}

/**
 * A plan written apart from any copy of the battle: its cards as saved, its usables by their place on the
 * unit's belt. It is said again in any copy holding the same unit.
 */
export interface SavedPlan {
    readonly cards: readonly SavedCard[]
    readonly usables: readonly number[]
}

/** A plan of `unit`, in the battle it is made in, written apart from it. */
export function savePlan(unit: Unit, plan: BattlePlan): SavedPlan {
    return {
        cards: plan.chain.cards.map(savedCard),
        usables: (plan.usables ?? []).map(each => unit.usables.indexOf(each)),
    }
}

/**
 * A saved plan said again with the cards and usables of `unit` in `battle`.
 *
 * @throws {@link Error} When the unit holds no such card or carries no such usable.
 */
export function loadPlan(battle: Battle, unit: Unit, saved: SavedPlan): BattlePlan {
    const cards = [...unit.hand, ...battle.planOf(unit)?.cards ?? []]
    const chain = new CardChain(cardsInHand(cards, saved.cards, unit.unlimited))
    const usables = saved.usables.map(at => {
        const usable = unit.usables[at]
        if(!usable) throw new Error(`${unit.name} carries no usable at ${at}.`)
        return usable
    })
    return usables.length > 0 ? { chain, usables } : { chain }
}

/**
 * What the other units are guessed to do, for every AI asked under one root decision: each unit at each
 * level is decided once, then read again by any path that asks for it. The **level** of a guess is how many
 * levels the guessed unit may still call plus one: at level 0 it is played by {@link leaf}, at a level `ℓ`
 * above by its own AI given `ℓ - 1`, which guesses the others at level `ℓ - 1` in the same memo.
 *
 * A guess is made in the copy of the battle of the first path that asks for it, and read again in the copies
 * of the others, secretized each with another seed: the hidden cards and draws may differ between them.
 *
 * It lives as long as the root decision: nothing is kept from a round to the next.
 */
export class PredictionMemo {

    /**
     * @param players - What plays the units of the players, which have no AI to ask, in the whole tree.
     * @param leaf - What plays any unit at level 0, in the whole tree: asked with its own `decide`, never
     * with this memo, so a leaf that guesses itself does so with its own leaf.
     */
    constructor(players: UnitController, leaf: UnitController){
        this.#players = players
        this.#leaf = leaf
    }

    /**
     * What `other` is guessed to do at `level`, in `view`.
     *
     * @throws {@link Error} When the battle cannot be copied, or the guess cannot be said again in `view`.
     */
    public planOf(view: Battle, other: Unit, level: number): BattlePlan {
        const index = view.units.indexOf(other)
        let byLevel = this.#plans.get(index)
        if(!byLevel){
            byLevel = new Map()
            this.#plans.set(index, byLevel)
        }
        const known = byLevel.get(level)
        if(known) return loadPlan(view, other, known)
        const plan = this.#decide(view, other, level)
        byLevel.set(level, savePlan(other, plan))
        return plan
    }

    /** The plan of `other` at `level`, decided now, in `view`. */
    #decide(view: Battle, other: Unit, level: number): BattlePlan {
        if(level <= 0) return askAi(view, other, this.#leaf, {}, 0)
        const controller = other.controller === "player" ? this.#players : view.controllerOf(other)
        if(!isPredicting(controller)) return askAi(view, other, controller, {}, level - 1)
        const { view: seen, unit } = viewFor(view, other)
        return loadPlan(view, other, savePlan(unit, controller.decideWith(unit, seen, level - 1, this)))
    }

    readonly #players: UnitController
    readonly #leaf: UnitController
    readonly #plans = new Map<number, Map<number, SavedPlan>>()
}

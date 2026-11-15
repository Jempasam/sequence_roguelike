import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import { cardsInHand, savedCard } from "../save/battleSave"
import type { SecretOptions } from "../save/battleSave"
import { CardChain } from "../card/CardChain"
import type { Carried } from "../usable/Usable"

/** What a unit chooses to do in a round: the chain it commits, and the usables it uses first. */
export interface BattlePlan {
    readonly chain: CardChain

    /** The usables it uses at the start of the round, of its belt, none for none. */
    readonly usables?: readonly Carried[]
}

/** What decides what a unit does in a round, from what the unit may know of the battle. */
export interface UnitController {
    /**
     * What `unit` wants to do this round, during the preparation.
     *
     * @param unit The unit that plays, in `view`.
     * @param view A copy of the battle the unit may know, see {@link Battle.secretize}: it may play rounds
     * on it, the battle it comes from is never touched.
     * @param depth How many levels of the AIs of the other units it may still call: 0 none, `n` from 1 a yes,
     * the ones it calls given `n - 1`. {@link ROOT_DEPTH} (`-1`) when nobody calls it: it is the root AI and
     * chooses its own depth.
     */
    decide(unit: Unit, view: Battle, depth: number): BattlePlan

    /**
     * Does it read nothing but the hand of its unit, so a copy of the battle is no use to it? It is then asked
     * with the battle itself, which it must not change.
     */
    readonly blind?: boolean
}

/** The depth given to an AI asked first, by no other AI: it knows it is the root and decides its own depth. */
export const ROOT_DEPTH = -1

/** The depth an AI works with: the one it was given, or its own when it is the root. */
export function depthOrOwn(given: number, own: number): number {
    return given === ROOT_DEPTH ? own : given
}

/** A copy of a battle as a unit may know it, with the unit in it. */
export interface View {
    readonly view: Battle
    readonly unit: Unit
}

/**
 * The battle as `unit` may know it: a copy, secretized.
 *
 * @throws {@link Error} When the battle cannot be copied: during an execution, or while a process goes on.
 */
export function viewFor(battle: Battle, unit: Unit, options: SecretOptions = {}): View {
    const index = battle.units.indexOf(unit)
    if(index < 0) throw new Error(`${unit.name} is not in this battle.`)
    const view = battle.clone()
    const seen = view.units[index]
    view.secretize(seen, options)
    return { view, unit: view.units[index] }
}

/**
 * What an AI decides for a unit, from a view of the battle: its chain is made of the cards of the unit
 * in the battle itself, to commit there.
 *
 * @throws {@link Error} When the battle cannot be copied, or the AI plays a card the unit does not hold.
 */
export function askAi(
    battle: Battle, unit: Unit, ai: UnitController, options: SecretOptions = {}, depth: number = ROOT_DEPTH,
): BattlePlan {
    if(ai.blind) return ai.decide(unit, battle, depth)
    const { view, unit: seen } = viewFor(battle, unit, options)
    return planIn(battle, unit, seen, ai.decide(seen, view, depth))
}

/**
 * A plan made in a view of a battle, said again with the cards and the usables of the unit in the battle itself.
 *
 * @param seen The unit as the view has it, which the plan is made of.
 * @throws {@link Error} When the plan plays a card the unit does not hold, or uses a usable it does not carry.
 */
export function planIn(battle: Battle, unit: Unit, seen: Unit, plan: BattlePlan): BattlePlan {
    const cards = [...unit.hand, ...battle.planOf(unit)?.cards ?? []]
    const chain = new CardChain(cardsInHand(cards, plan.chain.cards.map(savedCard), unit.unlimited))
    const usables = plan.usables?.map(each => {
        const at = seen.usables.indexOf(each)
        if(at < 0) throw new Error(`The AI uses a usable ${unit.name} does not carry.`)
        return unit.usables[at]
    })
    return { chain, usables }
}

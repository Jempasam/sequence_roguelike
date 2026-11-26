import { Rng } from "../base/Rng"
import { aiNamed } from "../ai/catalog"
import type { AiName } from "../ai/catalog"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import { PathAimCard } from "../card/subs/movement/PathAim"
import { StepCard } from "../card/subs/movement/Step"
import { UNLIMITED_CARDS } from "../catalog/cards"

/** A change made to a unit as its battle starts, before it draws any card: see {@link RunUnitRules}. */
export interface UnitRule {
    /** What tells it apart: a single rule of each is held, the last one given. */
    readonly id: string

    /** When it applies among the others, from the lowest, whatever order they were given in. */
    readonly rank: number

    /** What it does, as the player reads it. */
    readonly label: string

    apply(unit: Unit, battle: Battle): void
}

/** Take the cards of some kind out of the decks of a unit, the cards that hold them left in. */
function stripRule(id: string, rank: number, label: string, stripped: (card: Card) => boolean): UnitRule {
    return {
        id, rank, label,
        apply: unit => {
            for(const deck of unit.decks.all){
                for(const list of [deck.pile, deck.discard]){
                    list.splice(0, list.length, ...list.filter(card => !stripped(card)))
                }
            }
        },
    }
}

/** The steps of the decks are taken out. */
export const STRIP_STEP_RULE: UnitRule = stripRule(
    "stripStep", 0, "retire les cartes Avancer du deck", card => card instanceof StepCard,
)

/** The path cards of the decks are taken out. */
export const STRIP_PATH_RULE: UnitRule = stripRule(
    "stripPath", 1, "retire les cartes Chemin du deck", card => card instanceof PathAimCard,
)

/** The decks are shuffled, and no longer kept in order. */
export const SHUFFLE_RULE: UnitRule = {
    id: "shuffle", rank: 2, label: "mélange le deck",
    apply: (unit, battle) => {
        unit.stats.ordered.base = false
        unit.decks.recycle(battle.rng)
    },
}

/** The step and the turns are played unlimited, as the heroes do. */
export const MOVES_RULE: UnitRule = {
    id: "moves", rank: 3, label: "donne Avancer et Tourner en cartes permanentes",
    apply: unit => unit.grantUnlimited(UNLIMITED_CARDS),
}

/** The unit is played by an AI of its own, of the catalog, at depth 1. */
export function smartRule(name: AiName = "smart"): UnitRule {
    return {
        id: "smart", rank: 4, label: `donne l'IA « ${name} »`,
        apply: (unit, battle) => battle.control(unit, aiNamed(name, new Rng(battle.rng.int(2 ** 31)), 1)),
    }
}

/** Every rule at once. The path cards being taken out, the AI finds its way by itself by default. */
export function allRules(name: AiName = "smart8_path"): readonly UnitRule[] {
    return [STRIP_STEP_RULE, STRIP_PATH_RULE, SHUFFLE_RULE, MOVES_RULE, smartRule(name)]
}

import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { Heart } from "../../../heart/Heart"
import type { HeartKind } from "../../../heart/HeartKind"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"

import { ActionCard } from "../ActionCard"
import { summoning } from "../tools/playing"
import type { Rarity } from "../../Rarity"
import type { Visual } from "../../../base/Visual"

/** The hearts of a body a unit summons, red ones unless a kind is named: its base ones, and the summoning of the unit on top. */
export function summonedHearts(owner: Unit, count: number, kind: HeartKind = RED_HEART): Heart[] {
    return Heart.many(kind, count + owner.stats.summon.value)
}

/** What a card summons, and how. */
export interface SummonSpec {
    readonly sprite: Visual

    /** What each body is named. */
    readonly name: string

    /** How many hearts each body lives by, before the summoning of the unit. */
    readonly halves: number

    /** What kind of hearts they are, red ones by default. */
    readonly kind?: HeartKind

    /** Where the bodies stand, from where the unit would stand and face. */
    readonly spots: (unit: Unit, pose: Pose) => readonly Vector2[]

    /** Is it thrown there, flying, rather than set down at once? */
    readonly thrown?: boolean

    /** What each body gets once summoned, beyond its hearts and its wearing away. */
    readonly equip?: (battle: Battle, body: Unit, owner: Unit) => void
}

/**
 * A card summoning bodies for its unit: bodies with no deck, out of the order of play, which block the way
 * and draw the aim as any unit, and wear away half a heart at the end of each round.
 */
export class SummonCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,
        public readonly spec: SummonSpec,
    ){
        super(name, description, rarity, SummonCard.#summoning(spec))
    }


    static #summoning(spec: SummonSpec): Action {
        const { sprite, name, halves, kind, thrown, equip } = spec
        return summoning(spec.spots, unit => ({
            sprite, name, hearts: () => summonedHearts(unit, halves, kind), fleeting: true,
        }), { thrown: thrown ?? false, ...equip ? { equip } : {} })
    }
}

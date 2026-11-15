import type { Rng } from "../base/Rng"
import type { Unit } from "../battle/Unit"
import { CardChain } from "../card/CardChain"

import type { UnitController, BattlePlan } from "./UnitController"

/** The hand shuffled, then read from left to right: any order, always a valid chain. */
export class RandomAi implements UnitController {

    public readonly blind = true

    constructor(rng: Rng){
        this.#rng = rng
    }

    public decide(unit: Unit): BattlePlan {
        const hand = [...unit.hand]
        this.#rng.shuffle(hand)
        return { chain: CardChain.leftToRight(hand, unit.stats.chainSize.value) }
    }

    readonly #rng: Rng
}

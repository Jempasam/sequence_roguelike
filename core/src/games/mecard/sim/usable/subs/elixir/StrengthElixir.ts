import { Add, ModifierKey } from "../../../base/Attribute"
import { damage } from "../../../battle/words"
import type { Unit } from "../../../battle/Unit"

import { RoundElixir } from "./RoundElixir"

/** How many hearts the elixir of strength of the catalog adds to each attack, for its round. */
const STRENGTH_BONUS = 1

/** An elixir adding to the attacks of its unit for the round. */
export class StrengthElixir extends RoundElixir {


    constructor(
        /** How many hearts it adds to each attack. */
        public readonly bonus: number,
    ){
        super("Élixir de force", ["+", damage(bonus, "physical"), " à tes coups ce round."])
    }


    public boost(unit: Unit): () => void {
        const key = new ModifierKey("élixir de force")
        unit.stats.strength.add(key, new Add(this.bonus))
        return () => unit.stats.strength.remove(key)
    }
}

export const STRENGTH_ELIXIR = new StrengthElixir(STRENGTH_BONUS)

import { Add, ModifierKey } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { Unit } from "../../../battle/Unit"

import { RoundElixir } from "./RoundElixir"
import { visual } from "../../../base/Visual"

/** How much farther the elixir of haste of the catalog takes every move, added to the move factor. */
const HASTE_MOVE = 0.5

/** An elixir taking every move of its unit farther for the round. */
export class HasteElixir extends RoundElixir {


    constructor(
        /** How much farther it takes every move, added to the move factor. */
        public readonly move: number,
    ){
        super("Élixir de hâte", visual("usables/haste_elixir"), ["Tes déplacements vont ", frenchNumber(move * 100), " % plus loin ce round."])
    }


    public boost(unit: Unit): () => void {
        const key = new ModifierKey("élixir de hâte")
        unit.stats.move.add(key, new Add(this.move))
        return () => unit.stats.move.remove(key)
    }
}

export const HASTE_ELIXIR = new HasteElixir(HASTE_MOVE)

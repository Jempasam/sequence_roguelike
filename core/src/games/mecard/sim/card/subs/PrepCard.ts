import type { Text } from "../../../../../semantic"
import type { UnitContext } from "../../battle/Action"
import { PREPARATION } from "../CardType"
import type { Preparation } from "../CardType"
import type { Rarity } from "../Rarity"

import { AbstractCard } from "./AbstractCard"

/**
 * A preparation card acting at the end of the preparation: no input, an effect on the battle then, and
 * nothing left of it in the chain.
 */
export class PrepCard extends AbstractCard<Preparation> {


    public readonly output = PREPARATION
    public readonly input = null

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it does at the end of the preparation. */
        effect: (ctx: UnitContext) => void,
    ){
        super(name, description, rarity)
        this.#preparation = {
            rewrite: () => ({ cards: [], consumed: 0, acting: true }),
            prepare: effect,
        }
    }


    public get(): Preparation {
        return this.#preparation
    }


    readonly #preparation: Preparation
}

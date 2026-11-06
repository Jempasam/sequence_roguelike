import { ACTION } from "../../sim/card/CardType"
import type { CardType } from "../../sim/card/CardType"
import { Rarity } from "../../sim/card/Rarity"
import { AbstractCard } from "../../sim/card/subs/AbstractCard"

/**
 * A card named `?`, standing for any card an upgrade joins: it only has the types that make it read with
 * the upgrade. Pictured, never played.
 */
export class MysteryCard extends AbstractCard<unknown, unknown> {


    constructor(
        public readonly output: CardType<unknown> = ACTION,
        public readonly input: CardType<unknown>|null = null,
    ){
        super("?", "Une carte quelconque, que l'amélioration vient compléter.", Rarity.COMMON)
    }


    public get(): unknown {
        throw new Error("A mystery card is only pictured, it gives nothing.")
    }
}

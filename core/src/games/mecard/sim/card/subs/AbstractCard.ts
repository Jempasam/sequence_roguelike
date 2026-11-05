import type { Text } from "../../../../../semantic"
import type { Card } from "../Card"
import type { CardType } from "../CardType"
import { familyOfTypes } from "../Family"
import type { Family } from "../Family"
import type { Rarity } from "../Rarity"

/**
 * What every card shares: a name, a description and a rarity, and telling itself by its name in the color
 * of its rarity. What it takes and gives is its own.
 */
export abstract class AbstractCard<T, U = undefined> implements Card<T, U> {


    public abstract readonly output: CardType<T>

    public abstract readonly input: CardType<U>|null

    constructor(
        public readonly name: string,

        /** What it does, for the player. */
        public readonly description: Text,

        public readonly rarity: Rarity,
    ){}


    /** Its family, by what it takes and gives. */
    public get family(): Family {
        return familyOfTypes(this.output, this.input)
    }

    public abstract get(input: U): T

    public toString(): string { return this.name }

    public toSemString(): Text { return this.rarity.paint(this.name) }
}

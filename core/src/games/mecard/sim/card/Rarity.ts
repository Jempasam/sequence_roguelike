import type { Text } from "../../../../semantic"
import { colored, rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

/**
 * How often a card turns up as loot, the rarer the stronger: how often it is drawn, what it costs, and the
 * color its name is written in. Compared by reference: there are only the four of the class.
 */
export class Rarity {


    public static readonly COMMON = new Rarity("common", 0, rgba(0.9, 0.9, 0.85), 4, 15)

    public static readonly RARE = new Rarity("rare", 1, rgba(0.45, 0.7, 1), 3, 25)

    public static readonly EPIC = new Rarity("epic", 2, rgba(0.8, 0.5, 1), 2, 40)

    public static readonly LEGENDARY = new Rarity("legendary", 3, rgba(1, 0.75, 0.3), 1, 60)

    /** The rarities, the commonest first. */
    public static readonly ALL: readonly Rarity[] = [
        Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY,
    ]

    protected constructor(
        /** What it is called, for the console: `common`. */
        public readonly name: string,

        /** Where it stands, from 0 for the commonest. */
        public readonly rank: number,

        /** The color the name of a card of it is written in. */
        public readonly color: Rgba,

        /** How likely a card of it is to turn up in the loot, relative to the other rarities. */
        public readonly lootWeight: number,

        /** What a card of it costs at the shop, in gold. */
        public readonly price: number,
    ){}


    /** The highest of rarities, common for none. */
    public static highest(rarities: readonly Rarity[]): Rarity {
        return rarities.reduce((best, each) => each.rank > best.rank ? each : best, Rarity.COMMON)
    }

    /** A name in its color. */
    public paint(name: string): Text {
        return colored(this.color, name)
    }

    public toString(): string { return this.name }
}

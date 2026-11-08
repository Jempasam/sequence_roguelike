import type { Visual } from "../../base/Visual"
import type { Text } from "../../../../../semantic"
import { colored, rgba } from "../../base/Rgba"
import type { PlugContext } from "../../battle/Action"
import type { Item } from "../Item"

/** The color the name of an item is written in. */
const ITEM_COLOR = rgba(1, 0.85, 0.4)

/** What every item shares: a name, a description, and telling itself by its name in their color. */
export abstract class AbstractItem implements Item {


    constructor(
        public readonly name: string,

        /** Its picture. */
        public readonly icon: Visual,

        /** What it does, in one sentence, for the player. */
        public readonly description: Text,
    ){}


    public abstract init(ctx: PlugContext): void

    /** Nothing more to do by default: the battle takes back what it kept. */
    public dispose(ctx: PlugContext): void {
        void ctx
    }

    public toString(): string { return this.name }

    public toSemString(): Text { return colored(ITEM_COLOR, this.name) }
}

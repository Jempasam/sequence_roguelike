import type { Text } from "../../../../../semantic"
import type { Action } from "../../battle/Action"
import { ACTION } from "../CardType"
import type { Rarity } from "../Rarity"

import { AbstractCard } from "./AbstractCard"

/** A card taking actions and giving actions: a transformer or an expander. */
export class ModifierCard extends AbstractCard<readonly Action[], readonly Action[]> {


    public readonly output = ACTION
    public readonly input = ACTION

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** The actions it gives for the actions it takes. */
        public readonly change: (actions: readonly Action[]) => readonly Action[],
    ){
        super(name, description, rarity)
    }


    public get(actions: readonly Action[]): readonly Action[] {
        return this.change(actions)
    }
}

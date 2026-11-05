import type { Text } from "../../../../../semantic"
import type { Action } from "../../battle/Action"
import { ACTION } from "../CardType"
import type { Rarity } from "../Rarity"

import { AbstractCard } from "./AbstractCard"

/** An action card: no input, one action. */
export class ActionCard extends AbstractCard<readonly Action[]> {


    public readonly output = ACTION
    public readonly input = null

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it plays. */
        public readonly action: Action,
    ){
        super(name, description, rarity)
    }


    public get(): readonly Action[] {
        return [this.action]
    }
}

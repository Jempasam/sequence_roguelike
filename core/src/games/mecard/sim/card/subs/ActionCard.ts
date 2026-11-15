import type { Text } from "../../../../../semantic"
import type { Action } from "../../battle/Action"
import { ACTION } from "../CardType"
import type { Rarity } from "../Rarity"

import { AbstractCard } from "./AbstractCard"

/** An action card: no input, one action. */
export class ActionCard extends AbstractCard<Action> {


    public readonly output = ACTION
    public readonly input = null

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it plays. */
        public readonly action: Action,
    ){
        super(name, description, rarity)
    }


    public get(): Action {
        return this.action
    }
}

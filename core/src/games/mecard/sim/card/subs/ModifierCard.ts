import type { Text } from "../../../../../semantic"
import type { Action } from "../../battle/Action"
import type { Card } from "../Card"
import { ACTION } from "../CardType"
import type { Rarity } from "../Rarity"

import { AbstractCard } from "./AbstractCard"

/** A card taking an action and giving an action: it plays the one it takes in its own way. */
export class ModifierCard extends AbstractCard<Action, Action> {


    public readonly output = ACTION
    public readonly input = ACTION

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** The action it gives for the action it takes, and the cards of the tree that gave it. */
        public readonly change: (action: Action, tree: readonly Card[]) => Action,
    ){
        super(name, description, rarity)
    }


    public get(action: Action, tree: readonly Card[] = []): Action {
        return this.change(action, tree)
    }
}

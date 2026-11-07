import { joinText } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { BOMB } from "../combat/Bomb"
import { THRUST } from "../attack/Thrust"
import { SHOT } from "../attack/Shot"
import { AIM } from "../movement/Aim"
import { RAM } from "../movement/Ram"
import { STEP } from "../movement/Step"

/** A piece of a machine: the cards it is made of, for a card building it or putting them in the chain. */
export class ModuleCard extends AbstractCard<Module> {


    public readonly output = MODULE
    public readonly input = null

    constructor(
        name: string,

        /** The cards it holds, in the order they play. */
        public readonly cards: readonly Card[],
    ){
        super(name, ["Module : ", ...joinText(cards, " > "), "."], Rarity.COMMON)
    }


    public get(): Module {
        return { cards: () => this.cards, tune: () => {} }
    }
}

export const BOW_MODULE = new ModuleCard("Robot arc", [AIM, SHOT])
export const BULL_MODULE = new ModuleCard("Robot taureau", [AIM, RAM])
export const BLAST_MODULE = new ModuleCard("Robot explosif", [AIM, BOMB])
export const MISSILE = new ModuleCard("Missile", [STEP, THRUST, STEP, THRUST])

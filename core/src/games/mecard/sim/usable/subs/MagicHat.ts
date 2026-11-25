import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { BEAST_CARDS } from "../../card/subs/beast/beasts"
import { summonCardOf } from "../../card/subs/beast/BeastRewrites"
import { placeChainSummon } from "../../card/subs/summon/ChainSummons"
import type { ChainSummonCard } from "../../card/subs/summon/ChainSummons"

import { AbstractUsable } from "./AbstractUsable"
import { BATTLE_ROUND } from "../../base/keywords"

/** Every beast as a body it summons by itself, made once. */
const BEASTS: readonly ChainSummonCard[] = BEAST_CARDS.map(({ beast }) => summonCardOf(beast, beast, beast))

/** A magic hat: a beast drawn at random comes out of it, and plays as the beast of a card does. */
export class MagicHat extends AbstractUsable {


    constructor(){
        super(
            "Chapeau magique", visual("usables/magic_hat"),
            ["Invoque devant toi une bête tirée au hasard, qui joue chaque ", BATTLE_ROUND, ". 6 utilisations."],
            { charges: 6 },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const beast = battle.rng.pick(BEASTS)
        if(!beast) return
        placeChainSummon(battle, unit, beast.summon)
    }
}

export const MAGIC_HAT = new MagicHat()

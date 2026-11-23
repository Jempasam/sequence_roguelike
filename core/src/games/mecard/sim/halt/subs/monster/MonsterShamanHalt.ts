import { MONSTER, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { BEAST } from "../../../card/CardType"
import { FURY } from "../../../card/subs/beast/BeastRewrites"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import { giveKeyIfLacking } from "../../../run/visits"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DARK_COLOR } from "../halt_common"

import { beastCardOfMonster } from "./monsterCards"
import { MonsterCardHalt } from "./MonsterCardHalt"

/** The monster shaman: a monster made a spirit for a deck, with a fury if the deck has no use for one. */
export class MonsterShamanHalt extends MonsterCardHalt {


    constructor(run: Run){
        super(MONSTER_SHAMAN_HALT, run,
            ["Chaque ", MONSTER, " a un esprit. Je le réveille, et il court et mord pour toi."],
            sceneLook(28, 18, 31, "trainer_monster", { visual: "forest", coloration: [0.72, 0.56, 0.78] }),
            {
                unit: visual("units/shaman"),
            },
        )
    }


    protected readonly key = FURY

    protected make(monster: Monster): Card {
        return beastCardOfMonster(monster)
    }

    protected receive(deck: Card[], card: Card): Card|null {
        const fury = giveKeyIfLacking(deck, BEAST, FURY)
        deck.push(card)
        return fury ? FURY : null
    }
}

/** The sort of the monster shaman. */
export const MONSTER_SHAMAN_HALT: HaltType = {
    id: "monsterShaman",
    name: "Shaman des monstres",
    description: ["Fait d'un ", MONSTER, " une ", BEAST, " pour une ", UNIT, ", avec une fureur si elle n'en a aucun usage."],
    icon: visual("units/shaman", { letter: "SM!" }),
    glow: DARK_COLOR,
    transition: visual("cave-exit"),
    create: run => new MonsterShamanHalt(run),
}

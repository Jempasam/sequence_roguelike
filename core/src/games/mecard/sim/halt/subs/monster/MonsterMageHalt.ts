import { MONSTER, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { ELEMENT } from "../../../card/CardType"
import { CONJURATION } from "../../../card/subs/spell/ElementActions"
import type { Rng } from "../../../base/Rng"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import { giveKeyIfLacking } from "../../../run/visits"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DARK_COLOR } from "../halt_common"

import { elementCardOfMonster } from "./monsterCards"
import { MonsterCardHalt } from "./MonsterCardHalt"

/** The monster mage: a monster made an element for a deck, with a conjuration if the deck has none. */
export class MonsterMageHalt extends MonsterCardHalt {


    constructor(run: Run){
        super(MONSTER_MAGE_HALT, run,
            ["Un poison, un remède, et un ", MONSTER, " pour porter le tout : voilà un élément."],
            sceneLook(28, 18, 31, "trainer_monster", { visual: "space", coloration: [0.72, 0.56, 0.78] }),
            {
                unit: visual("units/mage"),
            },
        )
    }


    protected readonly key = CONJURATION

    protected make(monster: Monster, rng: Rng): Card {
        return elementCardOfMonster(monster, rng)
    }

    protected receive(deck: Card[], card: Card): Card|null {
        const conjuration = giveKeyIfLacking(deck, ELEMENT, CONJURATION)
        deck.push(card)
        return conjuration ? CONJURATION : null
    }
}

/** The sort of the monster mage. */
export const MONSTER_MAGE_HALT: HaltType = {
    id: "monsterMage",
    name: "Mage des monstres",
    description: ["Fait d'un ", MONSTER, " un ", ELEMENT, " pour une ", UNIT, ", avec une conjuration si elle n'en a aucune."],
    icon: visual("units/mage", { letter: "MG!" }),
    glow: DARK_COLOR,
    transition: visual("portal"),
    create: run => new MonsterMageHalt(run),
}

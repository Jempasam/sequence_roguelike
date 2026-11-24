import { MONSTER, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { ELEMENT } from "../../../card/CardType"
import { CONJURATION } from "../../../card/subs/spell/ElementActions"
import type { Rng } from "../../../base/Rng"
import type { Run } from "../../../run/Run"
import { giveKeyIfLacking } from "../../../run/visits"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DARK_COLOR } from "../halt_common"

import { offeredElements } from "./monsterCards"
import type { MonsterOffer } from "./monsterCards"
import { MonsterCardHalt } from "./MonsterCardHalt"

/** The monster mage: two monsters made an element for a deck, with a conjuration if the deck has none. */
export class MonsterMageHalt extends MonsterCardHalt {


    constructor(run: Run){
        super(MONSTER_MAGE_HALT, run,
            ["Deux ", MONSTER.as("monstres"), ", ce qu'ils infligent et ce qu'ils se donnent : voilà un élément."],
            sceneLook(28, 18, 31, "trainer_monster", { visual: "space", coloration: [0.72, 0.56, 0.78] }),
            {
                unit: visual("units/mage"),
            },
        )
    }


    protected readonly key = CONJURATION

    protected offered(rng: Rng): readonly MonsterOffer[] {
        return offeredElements(rng)
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
    description: [
        "Fait de deux ", MONSTER.as("monstres"), " un ", ELEMENT, " pour une ", UNIT,
        ", avec une conjuration si elle n'en a aucune.",
    ],
    icon: visual("units/mage", { letter: "MG!" }),
    glow: DARK_COLOR,
    transition: visual("portal"),
    create: run => new MonsterMageHalt(run),
}

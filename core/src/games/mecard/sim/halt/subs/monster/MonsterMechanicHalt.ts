import { UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { MODULE } from "../../../card/CardType"
import { IMPROVISED_ROBOT } from "../../../card/subs/mechanic/RobotCard"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import { giveKeyIfLacking } from "../../../run/visits"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DARK_COLOR } from "../halt_common"

import { moduleOfMonster } from "./monsterCards"
import { MonsterCardHalt } from "./MonsterCardHalt"

/** The monstrous mechanic: a monster made a module for a deck, with a robot if the deck has none. */
export class MonsterMechanicHalt extends MonsterCardHalt {


    constructor(run: Run){
        super(MONSTER_MECHANIC_HALT, run,
            `Un monstre, c'est juste une machine qui s'ignore. Je t'en tire un ${MODULE.name} !`,
            sceneLook(28, 18, 31, "trainer_monster", { visual: "workshop", coloration: [0.72, 0.56, 0.78] }),
            {
                unit: visual("units/mechanic"),
            },
        )
    }


    protected readonly key = IMPROVISED_ROBOT

    protected make(monster: Monster): Card {
        return moduleOfMonster(monster)
    }

    protected receive(deck: Card[], card: Card): Card|null {
        const robot = giveKeyIfLacking(deck, MODULE, IMPROVISED_ROBOT)
        deck.push(card)
        return robot ? IMPROVISED_ROBOT : null
    }
}

/** The sort of the monstrous mechanic. */
export const MONSTER_MECHANIC_HALT: HaltType = {
    id: "monsterMechanic",
    name: "Mécanicien monstrueux",
    description: ["Fait d'un monstre un ", MODULE, " pour une ", UNIT, ", avec un robot si elle n'en a aucun."],
    icon: visual("units/mechanic", { letter: "MM!" }),
    glow: DARK_COLOR,
    transition: visual("house-door"),
    create: run => new MonsterMechanicHalt(run),
}

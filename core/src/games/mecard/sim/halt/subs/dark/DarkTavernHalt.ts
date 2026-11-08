import { concat } from "../../../../../../semantic"
import { visual } from "../../../base/Visual"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { DARK_COLOR, DARK_MASK } from "../halt_common"
import { monsterShown, offeredMonsters } from "./monster_pool"

/** The shady tavern: a monster among some joins the party, planned by the players as a hero. */
export class DarkTavernHalt extends AbstractHalt {


    constructor(run: Run){
        super(DARK_TAVERN_HALT, run,
            "Ces monstres boivent ici. L'un d'eux peut te suivre, et t'obéir.",
            sceneLook(36, 23, 13, "mecard/travel/tavern"),
            {
                hat: "beret",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
            },
        )
        this.#monsters = offeredMonsters(run.rng)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Qui rejoint l'équipe ?", this.#monsters, monster => {
            return monsterShown(monster, [monster, " : ", monster.hearts, " cœurs, ", monster.draw, " cartes par round, joué comme un héros."])
        }, monster => {
            this.impact()
            ctx.tell(concat(this.run.recruit(monster), " rejoint l'équipe."))
        })
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the shady tavern. */
export const DARK_TAVERN_HALT: HaltType = {
    id: "darkTavern",
    name: "Taverne mal famée",
    description: "Un monstre parmi trois rejoint l'équipe, joué comme un héros.",
    icon: visual("travel/tavern/logo", { letter: "TA!" }),
    glow: DARK_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new DarkTavernHalt(run),
}

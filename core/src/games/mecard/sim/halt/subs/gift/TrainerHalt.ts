import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { COMMON_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { PETS } from "../../../catalog/pets"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { CARTE, DECK } from "../../../base/keywords"

/** The monsters a trainer offers as allies. */
export function trainerMonsters(rng: Rng): Monster[] {
    return [...distinct(rng, PETS, INVENTED_COUNTS - 1), ...distinct(rng, COMMON_MONSTERS, 1)]
}

/** The trainer: a monster among some joins the party, played by a bot. */
export class TrainerHalt extends AbstractHalt {


    constructor(run: Run){
        super(TRAINER_HALT, run,
            "Un de mes deux pets, ou d'un monstre croisé en chemin, te suivra, et se battra seul.",
            sceneLook(23, 28, 15, [
                "mecard/travel/trainer/1.png", "mecard/travel/trainer/2.png", "mecard/travel/trainer/3.png",
                "mecard/travel/trainer/4.png", "mecard/travel/trainer/5.png",
            ], "mecard/travel/trainer/border.png", haltPnj("trainer", [0.55, 0.75, 0.3], [0.3, 0.55, 0.2])),
        )
        this.#monsters = trainerMonsters(run.rng)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Quel allié ?", this.#monsters, monster => ({
            cards: [...new Set(monster.cards)], sprite: monster.sprite,
            text: [monster, " : ", monster.hearts, " cœurs, ", monster.draw, " ", CARTE.as("cartes"), " par round, joué par un bot, son ", DECK, " rebattu."],
        }), monster => {
            this.impact()
            ctx.tell(concat(this.run.tame(monster), " rejoint l'équipe."))
        })
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the trainer. */
export const TRAINER_HALT: HaltType = {
    name: "Dresseur",
    description: "Un allié parmi deux pets et un monstre, joué par un bot.",
    code: "DR",
    icon: "mecard/travel/trainer/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new TrainerHalt(run),
}

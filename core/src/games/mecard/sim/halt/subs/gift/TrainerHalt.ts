import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { LOOT_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { LOOT_PETS } from "../../../catalog/pets"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { CARTE, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The monsters a trainer offers as allies. */
export function trainerMonsters(rng: Rng): Monster[] {
    return [...distinct(rng, LOOT_PETS, INVENTED_COUNTS - 1), ...distinct(rng, LOOT_MONSTERS, 1)]
}

/** The trainer: a monster among some joins the party, played by a bot. */
export class TrainerHalt extends AbstractHalt {


    constructor(run: Run){
        super(TRAINER_HALT, run,
            "Une de mes trois bêtes, te suivra, et se battra seul.",
            sceneLook(23, 28, 15, "mecard/travel/trainer"),
            {
                hat: "huntingHat",
                clothes: rgba(0.55, 0.75, 0.3),
                hatColor: rgba(0.3, 0.55, 0.2),
                item: "whip"
            },
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
    id: "trainer",
    name: "Dresseur",
    description: "Un allié parmi deux pets et un monstre, joué par un bot.",    icon: visual("travel/trainer/logo", { letter: "DR" }),
    transition: DOOR_TRANSITION,
    create: run => new TrainerHalt(run),
}

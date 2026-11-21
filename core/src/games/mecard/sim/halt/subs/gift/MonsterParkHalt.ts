import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { AbstractHalt } from "../AbstractHalt"
import { CARTE, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { trainerMonsters } from "./TrainerHalt"

/** The monster park: like the trainer, a monster among some joins the party, played by a bot. Only placed by modes. */
export class MonsterParkHalt extends AbstractHalt {


    constructor(run: Run){
        super(MONSTER_PARK_HALT, run,
            "Choisis une bête du parc, elle te suivra, et se battra seule.",
            sceneLook(34, 40, 20, "monster-park"),
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

/** The sort of the monster park. */
export const MONSTER_PARK_HALT: HaltType = {
    id: "monster-park",
    name: "Parc à monstres",
    description: "Un allié parmi deux pets et un monstre, joué par un bot.",
    icon: visual("halts/monster-park", { letter: "PM" }),
    transition: visual("warm-door"),
    create: run => new MonsterParkHalt(run),
}

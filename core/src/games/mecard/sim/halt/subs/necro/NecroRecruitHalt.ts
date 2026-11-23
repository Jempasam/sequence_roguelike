import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { CARTE, DECK, BATTLE_ROUND, MONSTER } from "../../../base/keywords"
import { HeartCount } from "../../../battle/words"
import { visual } from "../../../base/Visual"
import { LOOT_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { LOOT_PETS } from "../../../catalog/pets"
import { distinct } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { AbstractHalt } from "../AbstractHalt"

/** How many monsters the halt offers, of the loot's monsters, and of its pets. */
const MONSTERS = 2
const PETS = 1

/** The monsters a recruiter offers: a few monsters of the loot, and a pet. */
export function recruitableMonsters(rng: Rng): Monster[] {
    return [...distinct(rng, LOOT_MONSTERS, MONSTERS), ...distinct(rng, LOOT_PETS, PETS)]
}

/**
 * Where a necromancer raises its army: a monster among some joins the party, whose cards the players
 * plan, played in the order of its {@link DECK}. Only placed by modes.
 */
export class NecroRecruitHalt extends AbstractHalt {


    constructor(run: Run){
        super(NECRO_RECRUIT_HALT, run,
            ["Choisis le ", MONSTER, " qui rejoindra ton armée."],
            sceneLook(34, 40, 20, "monster-park"),
            {
                hat: "huntingHat",
                clothes: rgba(0.35, 0.2, 0.45),
                hatColor: rgba(0.2, 0.1, 0.3),
                item: "whip",
            },
        )
        this.#monsters = recruitableMonsters(run.rng)
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Quel ", MONSTER, " ?"], this.#monsters, monster => ({
            cards: [...new Set(monster.cards)], sprite: monster.sprite,
            text: [
                monster, " : ", new HeartCount(monster.hearts), ", ", monster.draw, " ", CARTE.as("cartes"), " par ",
                BATTLE_ROUND, ", son ", DECK, " joué dans l'ordre.",
            ],
        }), monster => {
            this.impact()
            ctx.tell(concat(this.run.recruit(monster), " rejoint l'armée."))
        })
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the recruiter of monsters. */
export const NECRO_RECRUIT_HALT: HaltType = {
    id: "necro-recruit",
    name: "Antre des monstres",
    description: ["Un ", MONSTER, " parmi quelques-uns rejoint l'armée, ses ", CARTE.as("cartes"), " jouées dans l'ordre de son ", DECK, "."],
    icon: visual("halts/monster-park", { letter: "AM" }),
    transition: visual("warm-door"),
    create: run => new NecroRecruitHalt(run),
}

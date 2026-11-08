import { concat } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { BOSS_MONSTERS, monster } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { DARK_COLOR, DARK_MASK } from "../halt_common"
import { monsterShown, offeredMonsters } from "./monster_pool"

/** How many times fewer hearts a tamed boss has than the one fought. */
export const TAMED_BOSS_WEAKENING = 3

/** A boss as the tamer gives it: the same, with far fewer hearts. */
export function tamedBoss(boss: Monster): Monster {
    const { toString: _name, toSemString: _text, ...spec } = boss
    return monster({ ...spec, hearts: Math.ceil(boss.hearts / TAMED_BOSS_WEAKENING) })
}

/** The tamer: a boss among some joins the party, weakened, played by a bot. */
export class DarkTrainerHalt extends AbstractHalt {


    constructor(run: Run){
        super(DARK_TRAINER_HALT, run,
            "J'ai brisé ces boss. L'un d'eux te suivra, et se battra seul.",
            sceneLook(23, 28, 15, "mecard/travel/trainer"),
            {
                hat: "huntingHat",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                item: "whip",
                itemColor: DARK_COLOR,
            },
        )
        this.#bosses = offeredMonsters(run.rng, undefined, BOSS_MONSTERS).map(tamedBoss)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Quel allié ?", this.#bosses, boss => monsterShown(boss, [
            boss, " : ", boss.hearts, " cœurs, ", boss.draw, " ", CARTE.as("cartes"), " par round, joué par un bot, son ", DECK, " rebattu.",
        ]), boss => {
            this.impact()
            ctx.tell(concat(this.run.tame(boss), " rejoint l'équipe."))
        })
    }


    /** The bosses offered, already weakened. */
    readonly #bosses: readonly Monster[]
}

/** The sort of the tamer. */
export const DARK_TRAINER_HALT: HaltType = {
    id: "darkTrainer",
    name: "Dompteur",
    description: "Un boss affaibli parmi trois, joué par un bot.",
    icon: visual("travel/trainer/logo", { letter: "DR!" }),
    glow: DARK_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new DarkTrainerHalt(run),
}

import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { booster, openBooster } from "../../../catalog/boosters"
import type { Booster } from "../../../catalog/boosters"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { boosterShown } from "../gift/MagicianHalt"
import { DARK_COLOR, DARK_COLORATION, DARK_MASK } from "../halt_common"
import { offeredMonsters } from "./monster_pool"

/** How many cards a booster of a monster gives. */
export const MONSTER_BOOSTER_SIZE = 3

/** The booster of a monster: cards drawn from its deck, each kind of card once in the pool. */
export function monsterBooster(monster: Monster): Booster {
    return booster({
        name: monster.name,
        color: DARK_COLOR,
        icon: monster.cards[monster.cards.length - 1],
        pools: [{ count: MONSTER_BOOSTER_SIZE, pool: [...new Set(monster.cards)] }],
    })
}

/** The dark magician: a booster among some, each drawn from the deck of a monster. */
export class DarkMagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(DARK_MAGICIAN_HALT, run,
            ["Trois boosters, arrachés aux monstres : leurs ", CARTE.as("cartes"), " sont à toi."],
            sceneLook(26, 13, 41, "magician", { coloration: [0.72, 0.56, 0.78] }),
            {
                hat: "topHat",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                cues: { done: "spin" },
                item: "magicianWand",
                itemColor: DARK_COLOR,
            },
        )
        this.#boosters = offeredMonsters(run.rng).map(monsterBooster)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un booster", this.#boosters, boosterShown, chosen => {
            this.run.boosterOpened.notify(chosen)
            this.give(ctx, openBooster(this.run.rng, chosen))
        })
    }


    /** The boosters offered, one for each monster. */
    readonly #boosters: readonly Booster[]
}

/** The sort of the dark magician. */
export const DARK_MAGICIAN_HALT: HaltType = {
    id: "darkMagician",
    name: "Magicien noir",
    description: ["Un booster parmi trois, tirés dans les ", CARTE.as("cartes"), " des monstres."],
    icon: visual("halts/magician", { letter: "MG!" }),
    glow: DARK_COLOR,
    transition: visual("portal", { coloration: DARK_COLORATION }),
    create: run => new DarkMagicianHalt(run),
}

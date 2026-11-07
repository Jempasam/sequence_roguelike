import { rgba } from "../../../base/Rgba"
import { CARTE } from "../../../base/keywords"
import { BOOSTERS, openBooster } from "../../../catalog/boosters"
import type { Booster } from "../../../catalog/boosters"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { boosterShown } from "../gift/MagicianHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"

/** The booster, drawing twice as many cards from each of its pools. */
function doubled(booster: Booster): Booster {
    return { ...booster, pools: booster.pools.map(pool => ({ ...pool, count: pool.count * 2 })) }
}

/** The great magician: a booster among some, each drawing twice as many cards from every pool. */
export class GreatMagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(GREAT_MAGICIAN_HALT, run,
            ["Trois boosters, et chacun tient deux fois plus de ", CARTE.as("cartes"), " assorties."],
            sceneLook(26, 13, 41, "mecard/travel/magician"),
            {
                hat: GREAT_HAT,
                clothes: rgba(0.6, 0.3, 1),
                hatColor: GREAT_COLOR,
                cues: { done: "spin" },
                item: "magicianWand",
                itemColor: GREAT_COLOR
            },
        )
        this.#boosters = distinct(run.rng, BOOSTERS, INVENTED_COUNTS).map(doubled)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un booster", this.#boosters, boosterShown, chosen => {
            this.give(ctx, openBooster(this.run.rng, chosen))
        })
    }


    /** The boosters offered, doubled. */
    readonly #boosters: readonly Booster[]
}

/** The sort of the great magician. */
export const GREAT_MAGICIAN_HALT: HaltType = {
    id: "greatMagician",
    name: "Grand magicien",
    description: ["Un booster parmi trois, en double : deux fois plus de ", CARTE.as("cartes"), "."],
    code: "MG**",
    icon: "mecard/travel/magician/logo.png",
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatMagicianHalt(run),
}

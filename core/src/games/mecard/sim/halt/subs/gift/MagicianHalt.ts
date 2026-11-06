import { concat } from "../../../../../../semantic"
import { BOOSTERS, openBooster } from "../../../catalog/boosters"
import type { Booster } from "../../../catalog/boosters"
import { distinct, OFFER_SIZE } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { CardGiftHalt } from "./CardGiftHalt"
import { CARTE } from "../../../base/keywords"

/** A booster, closed: the card it is pictured by, and what it holds. */
function boosterShown(chosen: Booster): Shown {
    const count = chosen.pools.reduce((sum, pool) => sum + pool.count, 0)
    return { cards: [chosen.icon], text: concat(chosen.name, " : ", String(count), " cartes") }
}

/** The magician: a booster among some, its cards going together. */
export class MagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MAGICIAN_HALT, run,
            ["Trois boosters, et chacun tient des ", CARTE.as("cartes"), " assorties."],
            sceneLook(26, 13, 41, [
                "mecard/travel/magician/1.png", "mecard/travel/magician/2.png", "mecard/travel/magician/3.png",
                "mecard/travel/magician/4.png", "mecard/travel/magician/5.png",
            ], "mecard/travel/magician/border.png", haltPnj("magician", [0.6, 0.3, 1], [0.2, 0.15, 0.4], { done: "spin" })),
        )
        this.#boosters = distinct(run.rng, BOOSTERS, OFFER_SIZE)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un booster", this.#boosters, boosterShown, chosen => {
            this.give(ctx, openBooster(this.run.rng, chosen))
        })
    }


    /** The boosters offered. */
    readonly #boosters: readonly Booster[]
}

/** The sort of the magician. */
export const MAGICIAN_HALT: HaltType = {
    name: "Magicien",
    description: ["Un booster parmi trois : des ", CARTE.as("cartes"), " qui vont ensemble."],
    code: "MG",
    icon: "mecard/travel/magician/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new MagicianHalt(run),
}

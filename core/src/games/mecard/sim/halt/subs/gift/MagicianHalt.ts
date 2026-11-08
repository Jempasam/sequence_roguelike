import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import { LOOT_BOOSTERS, boosterPoolsText, openBooster } from "../../../catalog/boosters"
import type { Booster } from "../../../catalog/boosters"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { CardGiftHalt } from "./CardGiftHalt"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** A booster, closed, and what it holds, told under the pointer. */
export function boosterShown(chosen: Booster): Shown {
    return { cards: [], boosters: [chosen], text: concat(chosen.name, " : ", boosterPoolsText(chosen)) }
}

/** The magician: a booster among some, its cards going together. */
export class MagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MAGICIAN_HALT, run,
            ["Trois boosters, et chacun tient des ", CARTE.as("cartes"), " assorties."],
            sceneLook(26, 13, 41, "mecard/travel/magician"),
            {
                hat: "topHat",
                clothes: rgba(0.6, 0.3, 1),
                hatColor: rgba(0.2, 0.15, 0.4),
                cues: { done: "spin" },
                item: "magicianWand"
            },
        )
        this.#boosters = distinct(run.rng, LOOT_BOOSTERS, INVENTED_COUNTS)
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
    id: "magician",
    name: "Magicien",
    description: ["Un booster parmi trois : des ", CARTE.as("cartes"), " qui vont ensemble."],    icon: visual("travel/magician/logo", { letter: "MG" }),
    transition: DOOR_TRANSITION,
    create: run => new MagicianHalt(run),
}

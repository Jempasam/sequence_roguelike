import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { USABLES } from "../../../catalog/index"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { Usable } from "../../../usable/Usable"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { usableText } from "../shown"

/** The usables a witch offers. */
export function witchUsables(rng: Rng): Usable[] {
    return distinct(rng, USABLES, INVENTED_COUNTS)
}

/** The witch: a usable among some, for a character of the party. */
export class WitchHalt extends AbstractHalt {


    constructor(run: Run){
        super(WITCH_HALT, run,
            "Trois utilisables mijotent ici. Prends-en un.",
            sceneLook(20, 31, 15, "mecard/travel/witch"),
            {
                hat: "witchHat",
                clothes: rgba(0.6, 0.3, 0.8),
                hatColor: rgba(0.5, 0.25, 0.7),
                cues: { done: "spin" },
                item: "witchWand"
            },
        )
        this.#usables = witchUsables(run.rng)
    }


    public start(ctx: HaltContext): void {
        const show = (usable: Usable) => ({ cards: [], text: usableText(usable) })
        ctx.offer("Choisis un utilisable", this.#usables, show, usable => {
            ctx.hero(concat(usable, " : pour qui ?"), hero => {
                this.impact()
                this.run.giveUsable(hero, usable)
                ctx.tell(concat(usable, " pour ", hero, "."))
            })
        })
    }


    /** The usables offered. */
    readonly #usables: readonly Usable[]
}

/** The sort of the witch. */
export const WITCH_HALT: HaltType = {
    id: "witch",
    name: "Sorcière",
    description: "Un utilisable parmi trois.",
    code: "SO",
    icon: "mecard/travel/witch/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new WitchHalt(run),
}

import type { Card } from "../../../card/Card"
import { LEGENDARY_CARDS } from "../../../catalog/index"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { cardShown } from "../shown"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The great chest: a legendary card among some, free. */
export class GreatChestHalt extends CardGiftHalt {


    constructor(run: Run){
        super(GREAT_CHEST_HALT, run,
            ["Une ", CARTE, " légendaire parmi trois, gratuite."],
            sceneLook(31, 23, 13, "mecard/travel/chest"),
            // A great one keeps this chest, crowned as they all are.
            {
                hat: GREAT_HAT,
                clothes: GREAT_COLOR,
                hatColor: GREAT_COLOR,
                item: "scepter",
            },
        )
        this.#cards = distinct(run.rng, LEGENDARY_CARDS, INVENTED_COUNTS)
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis une ", CARTE], this.#cards, cardShown, card => this.give(ctx, [card]))
    }


    /** The cards offered. */
    readonly #cards: readonly Card[]
}

/** The sort of the great chest. */
export const GREAT_CHEST_HALT: HaltType = {
    id: "greatChest",
    name: "Grand coffre",
    description: ["Une ", CARTE, " légendaire parmi trois, gratuite."],
    icon: visual("travel/chest/logo", { letter: "CO+" }),
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatChestHalt(run),
}

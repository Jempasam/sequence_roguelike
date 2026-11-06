import type { Card } from "../../../card/Card"
import { lootCards, OFFER_SIZE } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { cardShown } from "../shown"
import { CardGiftHalt } from "./CardGiftHalt"
import { CARTE } from "../../../base/keywords"

/** The chest: a card among some, free. */
export class ChestHalt extends CardGiftHalt {


    constructor(run: Run){
        super(CHEST_HALT, run,
            // No character stands there, so it is only told.
            ["Une ", CARTE, " parmi trois, gratuite."],
            // Nobody standing there.
            sceneLook(31, 23, 13, [
                "mecard/travel/chest/1.png", "mecard/travel/chest/2.png", "mecard/travel/chest/3.png",
                "mecard/travel/chest/4.png", "mecard/travel/chest/5.png",
            ], "mecard/travel/chest/border.png"),
        )
        this.#cards = lootCards(run.rng, OFFER_SIZE)
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis une ", CARTE], this.#cards, cardShown, card => this.give(ctx, [card]))
    }


    /** The cards offered. */
    readonly #cards: readonly Card[]
}

/** The sort of the chest. */
export const CHEST_HALT: HaltType = {
    name: "Coffre",
    description: ["Une ", CARTE, " parmi trois, gratuite."],
    code: "CO",
    icon: "mecard/travel/chest/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new ChestHalt(run),
}

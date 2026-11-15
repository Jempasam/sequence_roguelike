import type { Card } from "../../../card/Card"
import { lootUpgraded } from "../../../catalog/upgrades"
import { INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { cardShown } from "../shown"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { MASTER_COLOR, MASTER_MASK, MASTER_TRANSITION } from "../halt_common"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The chest of a master: a card among some, each one upgraded, free. */
export class MasterChestHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MASTER_CHEST_HALT, run,
            ["Une ", CARTE, " améliorée parmi trois, gratuite."],
            sceneLook(31, 23, 13, "chest", { coloration: [0.82, 0.9, 1] }),
            // A master keeps this chest, who improved what it holds.
            {
                hat: "beret",
                mask: MASTER_MASK,
                clothes: MASTER_COLOR,
                hatColor: MASTER_COLOR,
                item: "hammer",
            },
        )
        this.#cards = Array.from({ length: INVENTED_COUNTS }, () => lootUpgraded(run.rng)).filter(card => card !== null)
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis une ", CARTE], this.#cards, cardShown, card => this.give(ctx, [card]))
    }


    /** The cards offered. */
    readonly #cards: readonly Card[]
}

/** The sort of the chest of a master. */
export const MASTER_CHEST_HALT: HaltType = {
    id: "masterChest",
    name: "Coffre de maître",
    description: ["Une ", CARTE, " améliorée parmi trois, gratuite."],
    icon: visual("halts/chest", { letter: "CO*" }),
    glow: MASTER_COLOR,
    transition: MASTER_TRANSITION,
    create: run => new MasterChestHalt(run),
}

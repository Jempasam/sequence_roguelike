import { rgba } from "../../../base/Rgba"
import type { Card } from "../../../card/Card"
import { inventedFusion, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { fusionShown } from "../shown"
import { CardGiftHalt } from "./CardGiftHalt"
import { FUSION } from "../../../base/keywords"
import { lootUpgraded } from "../../../catalog/upgrades"

/** The inventor: a fusion among some. */
export class InventorHalt extends CardGiftHalt {


    constructor(run: Run){
        super(INVENTOR_HALT, run,
            ["Trois ", FUSION.as("collages"), " sortent de l'atelier. Choisis le tien."],
            sceneLook(28, 26, 23, "mecard/travel/inventor"),
            {
                hat: "goggles",
                clothes: rgba(0.8, 0.7, 0.5),
                hatColor: rgba(0.35, 0.25, 0.15),
                item: "wrench"
            },
        )

        // Création des fusions
        this.#fusions = [
            ...Array.from({ length: INVENTED_COUNTS-1 }, () => inventedFusion(run.rng)),
            lootUpgraded(run.rng)!!,
        ]
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis un ", FUSION], this.#fusions, fusionShown, fusion => this.give(ctx, [fusion]))
    }


    /** The fusions offered. */
    readonly #fusions: readonly Card[]
}

/** The sort of the inventor. */
export const INVENTOR_HALT: HaltType = {
    name: "Inventeur",
    description: ["Un ", FUSION, " parmi trois."],
    code: "IN",
    icon: "mecard/travel/inventor/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new InventorHalt(run),
}

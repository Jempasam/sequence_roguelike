import { MASTER_COLOR, MASTER_MASK } from "../halt_common"
import { FUSION } from "../../../base/keywords"
import type { Card } from "../../../card/Card"
import { INVENTED_COUNTS, inventedFusion } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { upgradeOf } from "../deck/AlchemistHalt"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { fusionShown } from "../shown"
import { visual } from "../../../base/Visual"

/** The master inventor: an inventor whose every invention comes upgraded by an upgrade at random. */
export class MasterInventorHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MASTER_INVENTOR_HALT, run,
            ["Trois ", FUSION.as("collages"), ", chacun amélioré. Choisis le tien."],
            sceneLook(28, 26, 23, "mecard/travel/inventor"),
            {
                hat: "goggles",
                mask: MASTER_MASK,
                clothes: MASTER_COLOR,
                hatColor: MASTER_COLOR,
                item: "wrench"
            },
        )
        this.#fusions = Array.from({ length: INVENTED_COUNTS }, () => {
            const fusion = inventedFusion(run.rng)
            return upgradeOf(fusion, run.rng) ?? fusion
        })
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis un ", FUSION], this.#fusions, fusionShown, fusion => this.give(ctx, [fusion]))
    }


    /** The inventions offered, upgraded. */
    readonly #fusions: readonly Card[]
}

/** The sort of the master inventor. */
export const MASTER_INVENTOR_HALT: HaltType = {
    id: "masterInventor",
    name: "Maître inventeur",
    description: ["Un ", FUSION, " parmi trois, chacun amélioré."],
    icon: visual("travel/inventor/logo", { letter: "IN*" }),
    glow: MASTER_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new MasterInventorHalt(run),
}

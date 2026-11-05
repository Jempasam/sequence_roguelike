import type { Card } from "../../../card/Card"
import { inventedFusion, OFFER_SIZE } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { fusionShown } from "../shown"
import { CardGiftHalt } from "./CardGiftHalt"
import { COLLAGE } from "../../../base/keywords"

/** What the inventor says of itself. */
const LINE = ["Trois ", COLLAGE.as("collages"), " sortent de l'atelier. Choisis le tien."]

/** How the inventor looks. */
const LOOK = sceneLook(28, 26, 23, [
    "mecard/travel/inventor/1.png", "mecard/travel/inventor/2.png", "mecard/travel/inventor/3.png",
    "mecard/travel/inventor/4.png", "mecard/travel/inventor/5.png",
], "mecard/travel/inventor/border.png", haltPnj("inventor", [0.8, 0.7, 0.5], [0.35, 0.25, 0.15]))

/** The inventor: a fusion among some. */
export class InventorHalt extends CardGiftHalt {


    constructor(run: Run){
        super(INVENTOR_HALT, run, LINE, LOOK)
        this.#fusions = Array.from({ length: OFFER_SIZE }, () => inventedFusion(run.rng))
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis un ", COLLAGE], this.#fusions, fusionShown, fusion => this.give(ctx, [fusion]))
    }


    /** The fusions offered. */
    readonly #fusions: readonly Card[]
}

/** The sort of the inventor. */
export const INVENTOR_HALT: HaltType = {
    name: "Inventeur",
    description: ["Un ", COLLAGE, " parmi trois."],
    code: "IN",
    icon: "mecard/travel/inventor/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new InventorHalt(run),
}

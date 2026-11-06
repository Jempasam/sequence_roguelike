import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { ITEMS } from "../../../catalog/index"
import type { Item } from "../../../item/Item"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { described } from "../shown"

/** The items a merchant offers. */
export function merchantItems(rng: Rng): Item[] {
    return distinct(rng, ITEMS, INVENTED_COUNTS)
}

/** The merchant: an item among some, for a character of the party. */
export class MerchantHalt extends AbstractHalt {


    constructor(run: Run){
        super(MERCHANT_HALT, run,
            "J'ai trois objets pour toi. Prends-en un !",
            sceneLook(33, 23, 20, [
                "mecard/travel/merchant/1.png", "mecard/travel/merchant/2.png", "mecard/travel/merchant/3.png",
                "mecard/travel/merchant/4.png", "mecard/travel/merchant/5.png",
            ], "mecard/travel/merchant/border.png", haltPnj("merchant", null, null)),
        )
        this.#items = merchantItems(run.rng)
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un objet", this.#items, item => ({ cards: [], text: described(item, item) }), item => {
            ctx.hero(concat(item, " : pour qui ?"), hero => {
                this.impact()
                this.run.giveItem(hero, item)
                ctx.tell(concat(item, " pour ", hero, "."))
            })
        })
    }


    /** The items offered. */
    readonly #items: readonly Item[]
}

/** The sort of the merchant. */
export const MERCHANT_HALT: HaltType = {
    name: "Marchand ambulant",
    description: "Un objet parmi trois.",
    code: "MB",
    icon: "mecard/travel/merchant/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new MerchantHalt(run),
}

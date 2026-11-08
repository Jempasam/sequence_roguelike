import { concat } from "../../../../../../semantic"
import type { Item } from "../../../item/Item"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { merchantItems } from "../gift/MerchantHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { described } from "../shown"
import { visual } from "../../../base/Visual"

/** The great merchant: an item among some, for a character of the party, given three times over. */
export class GreatMerchantHalt extends AbstractHalt {


    constructor(run: Run){
        super(GREAT_MERCHANT_HALT, run,
            "J'ai trois objets pour toi. Prends-en un : tu en auras trois !",
            sceneLook(33, 23, 20, "mecard/travel/merchant"),
            {
                hat: GREAT_HAT,
                hatColor: GREAT_COLOR
            },
        )
        this.#items = merchantItems(run.rng)
    }


    public start(ctx: HaltContext): void {
        const show = (item: Item) => ({ cards: [], text: concat("×3 · ", described(item, item)) })
        ctx.offer("Choisis un objet", this.#items, show, item => {
            ctx.hero(concat(item, " ×3 : pour qui ?"), hero => {
                this.impact()
                for(let i = 0; i < 3; i++) this.run.giveItem(hero, item)
                ctx.tell(concat(item, " ×3 pour ", hero, "."))
            })
        })
    }


    /** The items offered. */
    readonly #items: readonly Item[]
}

/** The sort of the great merchant. */
export const GREAT_MERCHANT_HALT: HaltType = {
    id: "greatMerchant",
    name: "Grand marchand ambulant",
    description: "Un objet parmi trois, en triple.",
    icon: visual("travel/merchant/logo", { letter: "MB*" }),
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatMerchantHalt(run),
}

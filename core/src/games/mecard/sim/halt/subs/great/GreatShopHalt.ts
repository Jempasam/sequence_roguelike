import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { goodShown, shopGoods } from "../gift/ShopHalt"
import type { Good } from "../gift/ShopHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { visual } from "../../../base/Visual"

/** The share of every price the great shop takes off. */
export const GREAT_SHOP_DISCOUNT = 0.25

/** How many of a good the great shop sells at once, at most. */
const QUANTITIES: readonly number[] = [1, 2, 3]

/** What some of a good cost at the great shop, in gold. */
export function greatPrice(good: Good, quantity: number): number {
    return Math.round(good.price * quantity * (1 - GREAT_SHOP_DISCOUNT))
}

/**
 * The great shop: the goods of the shop but the removal, a quarter cheaper, each sold by one, two or three,
 * bought one after the other until the players leave.
 */
export class GreatShopHalt extends AbstractHalt {


    constructor(run: Run){
        super(GREAT_SHOP_HALT, run,
            [CARTE.as("Cartes"), ", objets, utilisables : par un, deux ou trois, et un quart moins cher !"],
            sceneLook(36, 28, 15, "mecard/travel/shop"),
            {
                hat: GREAT_HAT,
                clothes: rgba(0.35, 0.55, 1),
                hatColor: GREAT_COLOR
            },
        )
        this.#goods = shopGoods(run.rng).filter(good => good.kind !== "removal")
    }


    public start(ctx: HaltContext): void {
        this.#show(ctx, null)
    }


    /** The goods left. */
    readonly #goods: Good[]

    /** Offer the goods left, under the gold of the party and a warning, when there is one. */
    #show(ctx: HaltContext, warning: string|null): void {
        const { run } = this
        const title = `${run.gold} or${warning ? `. ${warning}` : ""}`
        ctx.offer(title, this.#goods, good => goodShown(good, greatPrice(good, 1)), good => {
            if(greatPrice(good, 1) > run.gold){
                this.#show(ctx, "Pas assez d'or.")
                ctx.react("refuse")
                return
            }
            this.#count(ctx, good)
        })
    }

    /** Offer how many of a good to buy, among those the party can pay. */
    #count(ctx: HaltContext, good: Good): void {
        const quantities = QUANTITIES.filter(quantity => greatPrice(good, quantity) <= this.run.gold)
        ctx.offer(`Combien ? ${this.run.gold} or`, quantities, quantity => {
            const shown = goodShown(good, greatPrice(good, quantity))
            return { ...shown, text: concat(`×${quantity} · `, shown.text ?? "") }
        }, quantity => this.#buy(ctx, good, quantity), { back: () => this.#show(ctx, null) })
    }

    /** Ask for who gets a good, then pay it and show the goods left. */
    #buy(ctx: HaltContext, good: Good, quantity: number): void {
        const again = (): void => this.#count(ctx, good)
        const bought = (): void => {
            this.impact()
            this.run.spend(greatPrice(good, quantity))
            this.#goods.splice(this.#goods.indexOf(good), 1)
            this.#show(ctx, null)
        }
        const times = (give: () => void): void => {
            for(let each = 0; each < quantity; each++) give()
        }
        switch(good.kind){
            case "card":
                ctx.hero(concat(good.card, " : pour qui ?"), hero => {
                    this.chooseDeck(ctx, concat(good.card, " : dans quel ", DECK, " ?"), hero, deck => {
                        this.run.changeDeck(deck, changed => times(() => changed.push(good.card)))
                        bought()
                    }, { back: again })
                })
                break
            case "item":
                ctx.hero(concat(good.item, " : pour qui ?"), hero => {
                    times(() => this.run.giveItem(hero, good.item))
                    bought()
                })
                break
            case "usable":
                ctx.hero(concat(good.usable, " : pour qui ?"), hero => {
                    times(() => this.run.giveUsable(hero, good.usable))
                    bought()
                })
                break
            default:
                throw new Error("A good of an unknown kind was bought.")
        }
    }
}

/** The sort of the great shop. */
export const GREAT_SHOP_HALT: HaltType = {
    id: "greatShop",
    name: "Grand magasin",
    description: [CARTE.as("Cartes"), ", objets, utilisables : par un, deux ou trois, un quart moins cher."],
    icon: visual("travel/shop/logo", { letter: "MA*" }),
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatShopHalt(run),
}

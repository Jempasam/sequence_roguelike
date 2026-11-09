import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { LOOT_ITEMS, LOOT_USABLES } from "../../../catalog/index"
import type { Item } from "../../../item/Item"
import { allCards } from "../../../run/Hero"
import { distinct, lootCards } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import { removeCards } from "../../../run/visits"
import type { Usable } from "../../../usable/Usable"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { described, usableText } from "../shown"
import { CARTE, DECK, SUPPRESSION, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** What an item costs at the shop, in gold. */
export const ITEM_PRICE = 50

/** What a usable costs at the shop, in gold. */
export const USABLE_PRICE = 20

/** What taking a card out of a deck costs at the shop, in gold. */
export const REMOVAL_PRICE = 30

/** How many cards, usables and items the shop sells at once. */
const SHOP_CARDS = 3
const SHOP_USABLES = 2
const SHOP_ITEMS = 1

/** Something the shop sells, and its price in gold. */
export type Good =
    | { readonly kind: "card", readonly card: Card, readonly price: number }
    | { readonly kind: "item", readonly item: Item, readonly price: number }
    | { readonly kind: "usable", readonly usable: Usable, readonly price: number }
    | { readonly kind: "removal", readonly price: number }

/** What a shop sells: cards, usables, an item, and taking a card out of a deck. */
export function shopGoods(rng: Rng): Good[] {
    return [
        ...lootCards(rng, SHOP_CARDS).map(card => ({ kind: "card", card, price: card.rarity.price }) as const),
        ...distinct(rng, LOOT_USABLES, SHOP_USABLES).map(usable => {
            return { kind: "usable", usable, price: USABLE_PRICE } as const
        }),
        ...distinct(rng, LOOT_ITEMS, SHOP_ITEMS).map(item => ({ kind: "item", item, price: ITEM_PRICE }) as const),
        { kind: "removal", price: REMOVAL_PRICE },
    ]
}

/** A good of the shop, with its price, the one it has unless another is given. */
export function goodShown(good: Good, cost: number = good.price): Shown {
    const price = `${cost} or`
    switch(good.kind){
        case "card": return { cards: [good.card], text: concat(price, " · ", good.card, " : ", good.card.description) }
        case "item": return { cards: [], items: [good.item], text: concat(price, " · ", described(good.item, good.item)) }
        case "usable": return { cards: [], usables: [good.usable], text: concat(price, " · ", usableText(good.usable)) }
        case "removal": return { cards: [], text: [price, " · ", SUPPRESSION.as("Retire"), " une ", CARTE, " du ", DECK, " d'une ", UNIT, "."] }
        default: throw new Error("A good of an unknown kind is sold.")
    }
}

/** The shop: its goods for their price, bought one after the other until the players leave. */
export class ShopHalt extends AbstractHalt {


    constructor(run: Run){
        super(SHOP_HALT, run,
            [CARTE.as("Cartes"), ", objets, utilisables. Je ", SUPPRESSION.as("retire"), " aussi une ", CARTE, " !"],
            sceneLook(36, 28, 15, "mecard/travel/shop"),
            {
                hat: "furToque",
                clothes: rgba(0.35, 0.55, 1),
                hatColor: rgba(1, 0.8, 0.3)
            },
        )
        this.#goods = shopGoods(run.rng)
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
        ctx.offer(title, this.#goods, goodShown, good => {
            if(good.price > run.gold){
                this.#show(ctx, "Pas assez d'or.")
                ctx.react("refuse")
                return
            }
            this.#buy(ctx, good)
        })
    }

    /** Ask for who a good is, then pay it and show the goods left. */
    #buy(ctx: HaltContext, good: Good): void {
        const bought = (): void => {
            this.impact()
            this.run.spend(good.price)
            this.#goods.splice(this.#goods.indexOf(good), 1)
            this.#show(ctx, null)
        }
        switch(good.kind){
            case "card":
                ctx.hero(concat(good.card, " : pour qui ?"), hero => {
                    this.chooseDeck(ctx, concat(good.card, " : dans quel ", DECK, " ?"), hero, deck => {
                        this.run.changeDeck(deck, changed => changed.push(good.card))
                        bought()
                    })
                })
                break
            case "item":
                ctx.hero(concat(good.item, " : pour qui ?"), hero => {
                    this.run.giveItem(hero, good.item)
                    bought()
                })
                break
            case "usable":
                ctx.hero(concat(good.usable, " : pour qui ?"), hero => {
                    this.run.giveUsable(hero, good.usable)
                    bought()
                })
                break
            case "removal":
                ctx.hero([SUPPRESSION.as("Retirer"), " une ", CARTE, " du ", DECK, " de qui ?"], hero => {
                    this.chooseDeck(ctx, [SUPPRESSION.as("Retirer"), " une ", CARTE, " de quel ", DECK, " ?"], hero, (deck, back) => {
                        ctx.cards([SUPPRESSION.as("Retire"), " une ", CARTE, " de ", hero], deck, { min: 1, max: 1 }, cards => {
                            this.run.changeDeck(deck, changed => removeCards(changed, cards))
                            bought()
                        }, { back, unlimited: hero.unlimited, copies: false })
                    }, { among: deck => deck.length > 0, back: () => this.#show(ctx, null) })
                }, { among: hero => allCards(hero).length > 0 })
                break
            default:
                throw new Error("A good of an unknown kind was bought.")
        }
    }
}

/** The sort of the shop. */
export const SHOP_HALT: HaltType = {
    id: "shop",
    name: "Magasin",
    description: ["Des ", CARTE.as("cartes"), ", des objets, des utilisables, et un service de ", SUPPRESSION, "."],    icon: visual("travel/shop/logo", { letter: "MA" }),
    transition: DOOR_TRANSITION,
    create: run => new ShopHalt(run),
}

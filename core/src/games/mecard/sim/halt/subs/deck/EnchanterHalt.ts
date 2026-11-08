import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { readsWhole } from "../../../card/CardChain"
import { FusionCard } from "../../../card/subs/composite/FusionCard"
import { LOOT_CARDS } from "../../../catalog/index"
import { allCards } from "../../../run/Hero"
import type { Hero } from "../../../run/Hero"
import { lootCards, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import { removeCards } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { cardShown, fusionShown } from "../shown"
import { CARTE, FUSION, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/**
 * The order an enchantment and a card of a deck fuse in: the enchantment first when it takes the card,
 * else after it, the one that reads whole. None when neither does: the enchantment does not fit the card.
 */
export function enchantedOrder(enchantment: Card, target: Card): Card[]|null {
    const before = [enchantment, target]
    if(readsWhole(before)) return before
    const after = [target, enchantment]
    return readsWhole(after) ? after : null
}

/** Does an enchantment fit a card? */
function fitting(enchantment: Card): (card: Card) => boolean {
    return card => enchantedOrder(enchantment, card) !== null
}

/**
 * What an enchanter offers to fuse into a card of a deck: cards of the loot fitting a card of the party, so
 * a deck holding no spell is not offered elements nobody could take. Fewer when fewer fit.
 */
export function enchantments(rng: Rng, party: readonly Hero[]): Card[] {
    const fits = (enchantment: Card): boolean => party.some(hero => allCards(hero).some(fitting(enchantment)))
    return lootCards(rng, INVENTED_COUNTS, LOOT_CARDS.filter(fits))
}

/**
 * The fusion an enchantment makes with a card, in the order that reads whole.
 *
 * @throws {@link Error} When the enchantment does not fit the card.
 */
export function enchanted(enchantment: Card, target: Card): Card {
    const order = enchantedOrder(enchantment, target)
    if(!order) throw new Error(`${enchantment.name} does not fit ${target.name}.`)
    return new FusionCard(order)
}

/**
 * Fuse an enchantment into a card of a deck, in the order that reads whole.
 *
 * @returns The fusion, now in the deck in place of the card.
 * @throws {@link Error} When the enchantment does not fit the card.
 */
export function enchant(deck: Card[], enchantment: Card, target: Card): Card {
    const fusion = enchanted(enchantment, target)
    removeCards(deck, [target])
    deck.push(fusion)
    return fusion
}

/** The enchanter: a card among some, fused to a card of a deck. */
export class EnchanterHalt extends AbstractHalt {


    constructor(run: Run){
        super(ENCHANTER_HALT, run,
            ["Je ", FUSION.as("colle"), " à ta ", CARTE, " l'un de mes trois enchantements."],
            sceneLook(15, 23, 43, "mecard/travel/enchanter"),
            {
                hat: "starCone",
                clothes: rgba(0.3, 0.45, 1),
                hatColor: rgba(0.75, 0.35, 1),
                item: "scepter"
            },
        )
        this.#offered = enchantments(run.rng, run.heroes)
    }


    public start(ctx: HaltContext): void {
        if(this.#offered.length === 0){
            ctx.tell(["Aucun enchantement ne va aux ", CARTE.as("cartes"), " de l'équipe."])
            return
        }
        const offer = (): void => ctx.offer("Choisis un enchantement", this.#offered, cardShown, enchantment => {
            const fits = fitting(enchantment)
            ctx.hero(concat(enchantment, " : sur le ", DECK, " de qui ?"), hero => {
                this.chooseDeck(ctx, concat(enchantment, " : sur quel ", DECK, " ?"), hero, (deck, back) => {
                    this.#chooseTarget(ctx, enchantment, deck, back)
                }, { among: deck => deck.some(fits), back: offer })
            }, { among: hero => allCards(hero).some(fits) })
        })
        offer()
    }


    /** The enchantments offered. */
    readonly #offered: readonly Card[]

    /** Ask for the card of a deck to enchant, then show the fusion it would make before making it. */
    #chooseTarget(ctx: HaltContext, enchantment: Card, deck: Card[], back?: () => void): void {
        const title = concat(enchantment, " : sur quelle ", CARTE, " ?")
        const pick = (): void => ctx.cards(title, deck, { min: 1, max: 1 }, ([target]) => {
            ctx.confirm(["Le ", FUSION, " enchanté :"], fusionShown(enchanted(enchantment, target), deck), "Enchanter", () => {
                this.impact()
                ctx.tell("Enchantée :", fusionShown(this.run.changeDeck(deck, changed => enchant(changed, enchantment, target)), deck))
            }, { back: pick })
        }, { among: fitting(enchantment), back })
        pick()
    }
}

/** The sort of the enchanter. */
export const ENCHANTER_HALT: HaltType = {
    id: "enchanter",
    name: "Enchanteur",
    description: ["Une ", CARTE, " parmi trois, ", FUSION.as("collée"), " à une ", CARTE, " du ", DECK, "."],    icon: visual("travel/enchanter/logo", { letter: "EN" }),
    transition: DOOR_TRANSITION,
    create: run => new EnchanterHalt(run),
}


import { rgba } from "../../../base/Rgba"
import type { Card } from "../../../card/Card"
import { heldCards } from "../../../card/subs/composite/CompositeCard"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { removeCards } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** What the antiquarian pays of the prices of the cards a card holds, for each of them. */
const SHARE_PER_CARD = 0.5

/**
 * What the antiquarian gives for a card, in gold: the prices of the cards of the catalog it is made of at any
 * depth, added up, then a share of that for each of them: the more they are, the more each is worth.
 */
export function appraisal(card: Card): number {
    const held = heldCards(card)
    const prices = held.reduce((sum, each) => sum + each.rarity.price, 0)
    return Math.round(prices * held.length * SHARE_PER_CARD)
}

/**
 * Sell a card of a deck to the antiquarian, for what it is {@link appraisal | worth}.
 *
 * @returns The gold it gave.
 */
export function sell(run: Run, deck: Card[], card: Card): number {
    run.changeDeck(deck, changed => removeCards(changed, [card]))
    const gold = appraisal(card)
    run.gold += gold
    return gold
}

/** The antiquarian: a card of a deck sold, for more gold the more cards it holds. */
export class AntiquarianHalt extends DeckHalt {


    constructor(run: Run){
        super(ANTIQUARIAN_HALT, run,
            ["Vends-moi une ", CARTE, " : plus elle en tient, plus je paie."],
            sceneLook(31, 26, 23, "mecard/travel/antiquarian"),
            {
                hat: "velvetToque",
                clothes: rgba(0.7, 0.6, 0.5),
                hatColor: rgba(0.45, 0.2, 0.5)
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length > 0
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const pick = (): void => ctx.cards(
            ["Vends une ", CARTE, " de ", hero, " : plus elle tient de ", CARTE.as("cartes"), ", plus chacune vaut"],
            deck, { min: 1, max: 1 }, ([card]) => {
                ctx.confirm("L'estimation :", {
                    cards: [card], from: deck, text: `${appraisal(card)} or pour ${card.name}.`,
                }, "Vendre", () => {
                    this.impact()
                    const gold = sell(this.run, deck, card)
                    ctx.tell(`Vendue ${gold} or.`)
                }, { back: pick })
            }, { back, unlimited: hero.unlimited, copies: false })
        pick()
    }
}

/** The sort of the antiquarian. */
export const ANTIQUARIAN_HALT: HaltType = {
    id: "antiquarian",
    name: "Antiquaire",
    description: ["Vends une ", CARTE, ", à son prix en magasin : plus elle tient de ", CARTE.as("cartes"), ", plus chacune vaut."],    icon: visual("travel/antiquarian/logo", { letter: "AN" }),
    transition: DOOR_TRANSITION,
    create: run => new AntiquarianHalt(run),
}

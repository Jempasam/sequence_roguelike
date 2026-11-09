import { rgba } from "../../../base/Rgba"
import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { upgraded, upgradesFor } from "../../../catalog/upgrades"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { transmute, withCopies } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { fusionShown } from "../shown"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"


/**
 * The card the alchemist makes of a card: one of the upgrades matching it, at random, joined to it. None
 * for a card with no upgrade: an aim, a turn, a wait, a dodge.
 */
export function upgradeOf(card: Card, rng: Rng): Card|null {
    const upgrade = rng.pick(upgradesFor(card))
    return upgrade ? upgraded(upgrade, card, rng) : null
}

/** Is a card of a deck one the alchemist can upgrade, the deck holding it twice? */
function isTwice(deck: readonly Card[], card: Card): boolean {
    return upgradesFor(card).length > 0 && deck.filter(each => each === card).length >= 2
}

/** The alchemist: two copies of a card become one, upgraded. */
export class AlchemistHalt extends DeckHalt {


    constructor(run: Run){
        super(ALCHEMIST_HALT, run,
            ["Deux copies d'une ", CARTE, " ? J'en fais une seule, améliorée."],
            sceneLook(15, 33, 23, "mecard/travel/alchemist"),
            {
                hat: "turban",
                clothes: rgba(0.35, 0.9, 0.45),
                hatColor: rgba(0.35, 0.8, 0.3),
                item: "potion"
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.some(card => isTwice(deck, card))
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.cards(["Deux copies de quelle ", CARTE, " ?"], deck, { min: 1, max: 1 }, ([card]) => {
            const upgrade = upgradeOf(card, this.run.rng)
            if(!upgrade) throw new Error(`${card.name} was offered to the alchemist, who has no upgrade for it.`)
            this.impact()
            const made = this.run.changeDeck(deck, changed => {
                return transmute(withCopies(changed, [card, card], hero.unlimited), card, upgrade)
            })
            ctx.tell("Transmutée :", fusionShown(made, deck))
        }, {
            // A card played unlimited has as many copies as the alchemist asks for.
            among: card => isTwice(deck, card) || hero.unlimited.includes(card) && upgradesFor(card).length > 0,
            back, unlimited: hero.unlimited,
        })
    }
}

/** The sort of the alchemist. */
export const ALCHEMIST_HALT: HaltType = {
    id: "alchemist",
    name: "Alchimiste",
    description: ["Deux copies d'une ", CARTE, " deviennent une seule, améliorée."],    icon: visual("travel/alchemist/logo", { letter: "AL" }),
    transition: DOOR_TRANSITION,
    create: run => new AlchemistHalt(run),
}

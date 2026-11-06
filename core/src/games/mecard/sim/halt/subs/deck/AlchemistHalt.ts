import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { upgraded, upgradesFor } from "../../../catalog/upgrades"
import { DODGE_CARD } from "../../../card/subs/combat/DodgeCard"
import { AIM } from "../../../card/subs/movement/Aim"
import { PATH_AIM } from "../../../card/subs/movement/PathAim"
import { TURN_LEFT, TURN_RIGHT } from "../../../card/subs/movement/TurnCard"
import { WAIT } from "../../../card/subs/movement/Wait"
import type { Run } from "../../../run/Run"
import { transmute } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "../DeckHalt"
import { fusionShown } from "../shown"
import { CARTE } from "../../../base/keywords"

/** What the alchemist says of itself. */
const LINE = ["Deux copies d'une ", CARTE, " ? J'en fais une seule, améliorée."]

/** How the alchemist looks. */
const LOOK = sceneLook(15, 33, 23, [
    "mecard/travel/alchemist/1.png", "mecard/travel/alchemist/2.png", "mecard/travel/alchemist/3.png",
    "mecard/travel/alchemist/4.png", "mecard/travel/alchemist/5.png",
], "mecard/travel/alchemist/border.png", haltPnj("alchemist", [0.35, 0.9, 0.45], [1, 0.8, 0.3]))

/** The cards no upgrade is always good for: playing them twice changes nothing worth it. */
const NOT_UPGRADED: readonly Card[] = [AIM, PATH_AIM, TURN_LEFT, TURN_RIGHT, WAIT, DODGE_CARD]

/** Is there an upgrade of the catalog for a card, which the alchemist makes of it? */
export function canUpgrade(card: Card): boolean {
    return !NOT_UPGRADED.includes(card) && upgradesFor(card).length > 0
}

/**
 * The card the alchemist makes of a card: one of the upgrades matching it, at random, joined to it. None
 * for a card with no upgrade: an aim, a turn, a wait, a dodge.
 */
export function upgradeOf(card: Card, rng: Rng): Card|null {
    if(NOT_UPGRADED.includes(card)) return null
    const upgrade = rng.pick(upgradesFor(card))
    return upgrade ? upgraded(upgrade, card, rng) : null
}

/** Is a card of a deck one the alchemist can upgrade, the deck holding it twice? */
function isTwice(deck: readonly Card[], card: Card): boolean {
    return canUpgrade(card) && deck.filter(each => each === card).length >= 2
}

/** The alchemist: two copies of a card become one, upgraded. */
export class AlchemistHalt extends DeckHalt {


    constructor(run: Run){
        super(ALCHEMIST_HALT, run, LINE, LOOK)
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.some(card => isTwice(deck, card))
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void): void {
        ctx.cards(["Deux copies de quelle ", CARTE, " ?"], deck, { min: 1, max: 1 }, ([card]) => {
            const upgrade = upgradeOf(card, this.run.rng)
            if(!upgrade) throw new Error(`${card.name} was offered to the alchemist, who has no upgrade for it.`)
            this.impact()
            ctx.tell("Transmutée :", fusionShown(this.run.changeDeck(deck, changed => transmute(changed, card, upgrade)), deck))
        }, { among: card => isTwice(deck, card), back })
    }
}

/** The sort of the alchemist. */
export const ALCHEMIST_HALT: HaltType = {
    name: "Alchimiste",
    description: ["Deux copies d'une ", CARTE, " deviennent une seule, améliorée."],
    code: "AL",
    icon: "mecard/travel/alchemist/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new AlchemistHalt(run),
}

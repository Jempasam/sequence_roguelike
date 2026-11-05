import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { ACTION } from "../../../card/CardType"
import { signatureOf } from "../../../card/CardChain"
import { LOOT_CARDS } from "../../../catalog/index"
import { fillersOf, lootCard, OFFER_SIZE, standing } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { CardGiftHalt } from "./CardGiftHalt"
import { CARTE } from "../../../base/keywords"

/** What the magician says of itself. */
const LINE = ["Trois boosters, et chacun tient des ", CARTE.as("cartes"), " assorties."]

/** How the magician looks. */
const LOOK = sceneLook(26, 13, 41, [
    "mecard/travel/magician/1.png", "mecard/travel/magician/2.png", "mecard/travel/magician/3.png",
    "mecard/travel/magician/4.png", "mecard/travel/magician/5.png",
], "mecard/travel/magician/border.png", haltPnj("magician", [0.6, 0.3, 1], [0.2, 0.15, 0.4], { done: "spin" }))

/** How many cards a booster holds beside the card they go in. */
const BOOSTER_FILLERS = 2

/** A set of cards that go together, sold as one: a card taking others, and cards that fit it. */
export interface Booster {
    /** The card the others go in. */
    readonly head: Card
    readonly cards: readonly Card[]
}

/** A booster of the magician: a card of the loot taking others, and cards fitting its first slot. */
export function booster(rng: Rng): Booster {
    const head = lootCard(rng, LOOT_CARDS.filter(card => signatureOf(card).input !== null && standing(card)))
    // Every head takes an input: the fallback is never used.
    const fillers = fillersOf(signatureOf(head).input ?? ACTION)
    return { head, cards: [head, ...Array.from({ length: BOOSTER_FILLERS }, () => lootCard(rng, fillers))] }
}

/** A booster: its cards, and the one they gather around. */
function boosterShown(chosen: Booster): Shown {
    return { cards: chosen.cards, text: concat("Autour de ", chosen.head, " : ", chosen.head.description) }
}

/** The magician: a booster among some, its cards going together. */
export class MagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MAGICIAN_HALT, run, LINE, LOOK)
        this.#boosters = Array.from({ length: OFFER_SIZE }, () => booster(run.rng))
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un booster", this.#boosters, boosterShown, chosen => this.give(ctx, chosen.cards))
    }


    /** The boosters offered. */
    readonly #boosters: readonly Booster[]
}

/** The sort of the magician. */
export const MAGICIAN_HALT: HaltType = {
    name: "Magicien",
    description: ["Un booster parmi trois : des ", CARTE.as("cartes"), " qui vont ensemble."],
    code: "MG",
    icon: "mecard/travel/magician/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new MagicianHalt(run),
}

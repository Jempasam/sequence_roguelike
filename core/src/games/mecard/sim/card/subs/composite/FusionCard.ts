import { joinText } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { PREPARATION } from "../../CardType"
import type { Preparation } from "../../CardType"
import { Rarity } from "../../Rarity"

import { GAMBLE } from "../modifier/GambleCard"
import { REPEAT_2, REPEAT_3 } from "../modifier/RepeatCard"
import { SWEEP } from "../attack/Sweep"
import { THRUST } from "../attack/Thrust"
import { CompositeCard } from "./CompositeCard"
import type { CompositeLook } from "./CompositeCard"
import { COLLAGE } from "../../../base/keywords"

/** What a fusion is named by, between the names of its cards. */
const FUSION_JOIN = " + "

/**
 * A fusion of cards, taking one card of room: a preparation, replaced at the end of the preparation in the
 * chain by its cards, which then read as any other, as if they were there: `Répéter ×2 + 50 %` takes the
 * action after it, `Estoc + Prière` goes into a `Répéter ×2` before it, which then repeats the thrust. Any
 * cards fuse, a fusion among them.
 */
export class FusionCard extends CompositeCard<Preparation> {


    public readonly output = PREPARATION
    public readonly input = null

    /** @throws {@link Error} For less than two cards. */
    constructor(cards: readonly Card[], look: CompositeLook = {}){
        if(cards.length < 2) throw new Error(`A fusion holds two cards at least, not ${cards.length}.`)
        super(cards, FUSION_JOIN, contents => {
            return [COLLAGE.as("Collage"), ". Fin de préparation : se remplace par ", ...joinText(contents, ", "), ", dans l'ordre."]
        }, look)
        this.#preparation = { rewrite: () => ({ cards: this.contents, consumed: 0, acting: false }) }
    }


    public get(): Preparation {
        return this.#preparation
    }


    readonly #preparation: Preparation
}

/** Is a card a fusion? */
export function isFusion(card: Card): card is FusionCard {
    return card instanceof FusionCard
}

/**
 * The cards a fusion is cut back into, one level down: a fusion inside it stays whole.
 *
 * @throws {@link Error} When the card is not a fusion.
 */
export function cut(card: Card): readonly Card[] {
    if(!isFusion(card)) throw new Error(`${card.name} is not a fusion: there is nothing to cut.`)
    return card.contents
}

/** Two thrusts for one card of room, each a coin toss. */
export const UNSTABLE_THRUST = new FusionCard([GAMBLE, REPEAT_2, THRUST], { name: "Estoc instable", rarity: Rarity.RARE })

/** Three sweeps for one card of room, each a coin toss. */
export const CURSED_FLURRY = new FusionCard([GAMBLE, REPEAT_3, SWEEP], { name: "Rafale maudite", rarity: Rarity.EPIC })

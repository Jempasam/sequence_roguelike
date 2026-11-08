import { rgba } from "../../../base/Rgba"
import { concat, joinText } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { MAX_REMOVED, removeCards } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { CARTE, DECK, SUPPRESSION, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The removal: a few cards of a deck, forgotten. */
export class RemovalHalt extends DeckHalt {


    constructor(run: Run){
        super(REMOVAL_HALT, run,
            ["Trois fois, confie-moi de une à trois ", CARTE.as("cartes"), ", je te les fais oublier."],
            sceneLook(26, 28, 33, "mecard/travel/removal"),
            {
                hat: "hood",
                clothes: rgba(0.6, 0.6, 0.65),
                hatColor: rgba(0.3, 0.3, 0.4)
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length > 0
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.cards([SUPPRESSION.as("Retire"), " de 1 à ", MAX_REMOVED, " ", CARTE.as("cartes"), " de ", hero], deck,
            { min: 1, max: MAX_REMOVED }, cards => {
                this.impact()
                this.run.changeDeck(deck, changed => removeCards(changed, cards))
                this.#forgotten.push(...cards)
                this.#left--
                const more = this.#left > 0 && this.run.heroes.some(each => each.decks.some(other => this.fits(other)))
                if(more) this.start(ctx)
                else ctx.tell(concat("Oubliées : ", joinText(this.#forgotten, ", "), "."))
            }, { back })
    }


    /** How many times it still offers to forget. */
    #left = REMOVAL_OFFERS

    /** The cards forgotten so far. */
    readonly #forgotten: Card[] = []
}

/** How many times the removal offers to forget cards. */
export const REMOVAL_OFFERS = 3

/** The sort of the removal. */
export const REMOVAL_HALT: HaltType = {
    id: "removal",
    name: "Oubli",
    description: ["Trois fois : ", SUPPRESSION.as("retire"), " de une à trois ", CARTE.as("cartes"), " du ", DECK, " d'une ", UNIT, "."],
    icon: visual("travel/removal/logo", { letter: "OU" }),
    transition: DOOR_TRANSITION,
    create: run => new RemovalHalt(run),
}

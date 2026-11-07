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

/** The removal: a few cards of a deck, forgotten. */
export class RemovalHalt extends DeckHalt {


    constructor(run: Run){
        super(REMOVAL_HALT, run,
            ["Confie-moi de une à trois ", CARTE.as("cartes"), ", je te les fais oublier."],
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
                ctx.tell(concat("Oubliées : ", joinText(cards, ", "), "."))
            }, { back })
    }
}

/** The sort of the removal. */
export const REMOVAL_HALT: HaltType = {
    id: "removal",
    name: "Oubli",
    description: [SUPPRESSION.as("Retire"), " de une à trois ", CARTE.as("cartes"), " du ", DECK, " d'une ", UNIT, "."],
    code: "OU",
    icon: "mecard/travel/removal/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new RemovalHalt(run),
}

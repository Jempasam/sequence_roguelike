import { concat, joinText } from "../../../../../../semantic"
import { isFusion } from "../../../card/subs/composite/FusionCard"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { cutFusions, MAX_CUT } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "../DeckHalt"
import { CARTE, COLLAGE } from "../../../base/keywords"

/** What the butcher says of itself. */
const LINE = ["Un ou deux ", COLLAGE.as("collages"), " à découper ? Je te rends leurs ", CARTE.as("cartes"), "."]

/** How the butcher looks. */
const LOOK = sceneLook(33, 15, 13, [
    "mecard/travel/butcher/1.png", "mecard/travel/butcher/2.png", "mecard/travel/butcher/3.png",
    "mecard/travel/butcher/4.png", "mecard/travel/butcher/5.png",
], "mecard/travel/butcher/border.png", haltPnj("butcher", [0.75, 0.2, 0.15], null, { pick: "strike" }))

/** The butcher: a few fusions of a deck cut back into their cards. */
export class ButcherHalt extends DeckHalt {


    constructor(run: Run){
        super(BUTCHER_HALT, run, LINE, LOOK)
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.some(isFusion)
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.cards(["Coupe 1 ou ", MAX_CUT, " ", COLLAGE.as("collages"), " de ", hero], deck, { min: 1, max: MAX_CUT }, cards => {
            this.impact()
            this.run.changeDeck(deck, changed => cutFusions(changed, cards))
            ctx.tell(concat("Coupées : ", joinText(cards, ", "), "."))
        }, { among: isFusion, back })
    }
}

/** The sort of the butcher. */
export const BUTCHER_HALT: HaltType = {
    name: "Boucher",
    description: ["Coupe un ou deux ", COLLAGE.as("collages"), " : chacun redevient ses ", CARTE.as("cartes"), "."],
    code: "BU",
    icon: "mecard/travel/butcher/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new ButcherHalt(run),
}

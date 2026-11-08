import { rgba } from "../../../base/Rgba"
import { concat, joinText } from "../../../../../../semantic"
import { isComposite } from "../../../card/subs/composite/CompositeCard"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { cutFusions, MAX_CUT } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { CARTE, COMPOSITE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The butcher: a few fusions of a deck cut back into their cards. */
export class ButcherHalt extends DeckHalt {


    constructor(run: Run){
        super(BUTCHER_HALT, run,
            ["Une ou deux ", COMPOSITE.as("fusions"), " à découper ? Je te rends leurs ", CARTE.as("cartes"), "."],
            sceneLook(33, 15, 13, "mecard/travel/butcher"),
            {
                hat: "chefToque",
                clothes: rgba(0.95, 0.95, 0.95),
                cues: { pick: "strike" },
                item: "cleaver"
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.some(isComposite)
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.cards(["Coupe 1 ou ", MAX_CUT, " ", COMPOSITE.as("fusions"), " de ", hero], deck, { min: 1, max: MAX_CUT }, cards => {
            this.impact()
            this.run.changeDeck(deck, changed => cutFusions(changed, cards))
            ctx.tell(concat("Coupées : ", joinText(cards, ", "), "."))
        }, { among: isComposite, back })
    }
}

/** The sort of the butcher. */
export const BUTCHER_HALT: HaltType = {
    id: "butcher",
    name: "Boucher",
    description: ["Coupe une ou deux ", COMPOSITE.as("fusions"), " : chacun redevient ses ", CARTE.as("cartes"), "."],    icon: visual("travel/butcher/logo", { letter: "BU" }),
    transition: DOOR_TRANSITION,
    create: run => new ButcherHalt(run),
}

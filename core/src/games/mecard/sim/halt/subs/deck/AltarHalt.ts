import { concat, joinText } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { sacrifice } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { CARTE, DECK } from "../../../base/keywords"

/** The cards of a deck with one copy of each card given taken out. */
function without(cards: readonly Card[], taken: readonly Card[]): Card[] {
    const left = [...cards]
    for(const card of taken){
        const index = left.lastIndexOf(card)
        if(index >= 0) left.splice(index, 1)
    }
    return left
}

/** The altar: two cards sacrificed, then a third copied, among those left. */
export class AltarHalt extends DeckHalt {


    constructor(run: Run){
        super(ALTAR_HALT, run,
            ["Offre deux ", CARTE.as("cartes"), ", et je copie une troisième de ton ", DECK, "."],
            sceneLook(36, 13, 18, [
                "mecard/travel/altar/1.png", "mecard/travel/altar/2.png", "mecard/travel/altar/3.png",
                "mecard/travel/altar/4.png", "mecard/travel/altar/5.png",
            ], "mecard/travel/altar/border.png", haltPnj("altar", [0.9, 0.2, 0.25], [1, 0.85, 0.3])),
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length >= 3
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const sacrifices = (): void => ctx.cards(["Sacrifie deux ", CARTE.as("cartes"), " de ", hero], deck,
            { min: 2, max: 2 }, sacrificed => {
                ctx.cards(["Copie une autre ", CARTE], without(deck, sacrificed), { min: 1, max: 1 }, ([copied]) => {
                    this.impact()
                    const [one, other] = sacrificed
                    this.run.changeDeck(deck, changed => sacrifice(changed, [one, other], copied))
                    ctx.tell(concat(joinText(sacrificed, ", "), " pour une copie de ", copied, "."))
                }, { from: deck, back: sacrifices })
            }, { back })
        sacrifices()
    }
}

/** The sort of the altar. */
export const ALTAR_HALT: HaltType = {
    name: "Autel sacrificiel",
    description: ["Sacrifie deux ", CARTE.as("cartes"), " : une troisième ", CARTE, " du ", DECK, " est copiée."],
    code: "AU",
    icon: "mecard/travel/altar/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new AltarHalt(run),
}

import { FusionCard } from "../../../card/subs/composite/FusionCard"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { forge } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { fusionShown } from "../shown"
import { CARTE, FUSION, DECK } from "../../../base/keywords"

/** The forge: two cards of a deck fused, in the order picked. */
export class ForgeHalt extends DeckHalt {


    constructor(run: Run){
        super(FORGE_HALT, run,
            ["Donne-moi deux ", CARTE.as("cartes"), ", je les forge dans l'ordre choisi."],
            sceneLook(41, 18, 10, [
                "mecard/travel/forge/1.png", "mecard/travel/forge/2.png", "mecard/travel/forge/3.png",
                "mecard/travel/forge/4.png", "mecard/travel/forge/5.png",
            ], "mecard/travel/forge/border.png", haltPnj("forge", [1, 0.45, 0.15], [0.4, 0.3, 0.2], { pick: "strike" })),
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length >= 2
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const pick = (): void => ctx.cards(
            [FUSION.as("Colle"), " deux ", CARTE.as("cartes"), " de ", hero, ", dans l'ordre où tu les choisis"], deck,
            { min: 2, max: 2 }, cards => {
                ctx.confirm(["Le ", FUSION, " forgé :"], fusionShown(new FusionCard(cards), deck), "Forger", () => {
                    this.impact()
                    ctx.tell("Forgée :", fusionShown(this.run.changeDeck(deck, changed => forge(changed, cards)), deck))
                }, { back: pick })
            }, { back })
        pick()
    }
}

/** The sort of the forge. */
export const FORGE_HALT: HaltType = {
    name: "Forge",
    description: [FUSION.as("Colle"), " deux ", CARTE.as("cartes"), " du ", DECK, ", dans l'ordre choisi."],
    code: "FO",
    icon: "mecard/travel/forge/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new ForgeHalt(run),
}

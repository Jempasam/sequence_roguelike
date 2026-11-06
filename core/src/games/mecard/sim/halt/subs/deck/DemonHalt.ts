import { concat } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { possess } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { CAVE_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { CARTE, FUSION, DECK, UNIT } from "../../../base/keywords"

/** The demon: a whole deck fused by pairs. */
export class DemonHalt extends DeckHalt {


    constructor(run: Run){
        super(DEMON_HALT, run,
            ["Signe, et je ", FUSION.as("colle"), " par paires tout le ", DECK, " d'une ", UNIT, "."],
            sceneLook(31, 8, 10, [
                "mecard/travel/demon/1.png", "mecard/travel/demon/2.png", "mecard/travel/demon/3.png",
                "mecard/travel/demon/4.png", "mecard/travel/demon/5.png",
            ], "mecard/travel/demon/border.png", haltPnj("demon", [0.8, 0.1, 0.15], [1, 0.75, 0.2], { arrive: "surprise" })),
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length >= 2
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.confirm("Le pacte :", {
            cards: [], text: concat("Toutes les ", CARTE.as("cartes"), " de ", hero, " seront ", FUSION.as("collées"), " par paires."),
        }, "Pactiser", () => {
            this.impact()
            const fused = this.run.changeDeck(deck, possess)
            ctx.tell(concat("Le ", DECK, " de ", hero, " tient maintenant ", fused.length, " ", CARTE.as("cartes"), "."))
        }, { back })
    }
}

/** The sort of the demon. */
export const DEMON_HALT: HaltType = {
    name: "Démon",
    description: ["Toutes les ", CARTE.as("cartes"), " d'une ", UNIT, " sont ", FUSION.as("collées"), " par paires."],
    code: "DÉ",
    icon: "mecard/travel/demon/logo.png",
    transition: CAVE_TRANSITION,
    create: run => new DemonHalt(run),
}

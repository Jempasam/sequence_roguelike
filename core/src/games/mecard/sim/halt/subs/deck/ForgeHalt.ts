import { rgba } from "../../../base/Rgba"
import { FusionCard } from "../../../card/subs/composite/FusionCard"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { forge, withCopies } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { fusionShown } from "../shown"
import { CARTE, FUSION, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The forge: two cards of a deck fused, in the order picked. */
export class ForgeHalt extends DeckHalt {


    constructor(run: Run){
        super(FORGE_HALT, run,
            ["Donne-moi deux ", CARTE.as("cartes"), ", je les forge dans l'ordre choisi."],
            sceneLook(41, 18, 10, "mecard/travel/forge"),
            {
                hat: "skullcap",
                clothes: rgba(1, 0.45, 0.15),
                hatColor: rgba(0.4, 0.3, 0.2),
                cues: { pick: "strike" },
                item: "hammer"
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length >= 2
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const round = (n: 1|2, back?: () => void): void => {
            const ask = (): void => ctx.confirm(
                ["Je ", FUSION.as("forge"), n == 1 ? " une première" : " une seconde", " paire de ", CARTE.as("cartes"), " ?"],
                { cards: [] }, "Forger", pick, back ? { back } : undefined)
            const pick = (): void => ctx.cards(
                [FUSION.as("Colle"), " deux ", CARTE.as("cartes"), " de ", hero, ", dans l'ordre où tu les choisis"], deck,
                { min: 2, max: 2 }, cards => {
                    ctx.confirm(["Le résultat ", FUSION.as("forgé"), " :"], fusionShown(new FusionCard(cards), deck), "Forger", () => {
                        this.impact()
                        const made = this.run.changeDeck(deck, changed => forge(withCopies(changed, cards, hero.unlimited), cards))
                        if (n == 1 && this.fits(deck)) round(2)
                        else ctx.tell([FUSION.as("Forgée"), " :"], fusionShown(made, deck))
                    }, { back: pick })
                }, { back: ask, unlimited: hero.unlimited })
            ask()
        }
        round(1, back)
    }
}

/** The sort of the forge. */
export const FORGE_HALT: HaltType = {
    id: "forge",
    name: "Forge",
    description: [FUSION.as("Colle"), " deux ", CARTE.as("cartes"), " du ", DECK, ", dans l'ordre choisi."],    icon: visual("travel/forge/logo", { letter: "FO" }),
    transition: DOOR_TRANSITION,
    create: run => new ForgeHalt(run),
}

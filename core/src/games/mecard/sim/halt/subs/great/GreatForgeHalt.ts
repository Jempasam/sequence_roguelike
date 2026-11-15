import { rgba } from "../../../base/Rgba"
import { FusionCard } from "../../../card/subs/composite/FusionCard"
import { composable } from "../../../card/Card"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { forge, withCopies } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DeckHalt } from "../deck/DeckHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { fusionShown } from "../shown"
import { CARTE, FUSION, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** How many times the great forger offers to forge. */
const ROUNDS = 3

/** How the great forger calls each round. */
const ROUND_NAMES: readonly string[] = [" une première fois", " une deuxième fois", " une troisième fois"]

/** The great forger: up to three cards of a deck fused in the order picked, offered up to three times. */
export class GreatForgeHalt extends DeckHalt {


    constructor(run: Run){
        super(GREAT_FORGE_HALT, run,
            ["Donne-moi deux ou trois ", CARTE.as("cartes"), ", je les forge dans l'ordre choisi, jusqu'à trois fois."],
            sceneLook(41, 18, 10, "forge", { coloration: [1, 0.88, 0.62] }),
            {
                hat: GREAT_HAT,
                clothes: rgba(1, 0.45, 0.15),
                hatColor: GREAT_COLOR,
                cues: { pick: "strike" },
                item: "hammer",
                itemColor: GREAT_COLOR
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.filter(composable).length >= 2
    }

    /** How many times the great forger already forged. */
    #forged = 0

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const round = (n: number, back?: () => void): void => {
            const ask = (): void => ctx.confirm(
                ["Je ", FUSION.as("forge"), " des ", CARTE.as("cartes"), ROUND_NAMES[n], " ?"],
                { cards: [] }, "Forger", pick, back ? { back } : undefined)
            const pick = (): void => ctx.cards(
                [FUSION.as("Colle"), " deux ou trois ", CARTE.as("cartes"), " de ", hero, ", dans l'ordre où tu les choisis"], deck,
                { min: 2, max: 3 }, cards => {
                    ctx.confirm(["Le résultat ", FUSION.as("forgé"), " :"], fusionShown(new FusionCard(cards), deck), "Forger", () => {
                        this.impact()
                        const made = this.run.changeDeck(deck, changed => forge(withCopies(changed, cards, hero.unlimited), cards))
                        this.#forged = n + 1
                        const more = n + 1 < ROUNDS && this.run.heroes.some(other => other.decks.some(each => this.fits(each)))
                        if (more) this.start(ctx)
                        else ctx.tell([FUSION.as("Forgée"), " :"], fusionShown(made, deck))
                    }, { back: pick })
                }, { back: ask, unlimited: hero.unlimited, among: composable })
            ask()
        }
        round(this.#forged, back)
    }
}

/** The sort of the great forger. */
export const GREAT_FORGE_HALT: HaltType = {
    id: "greatForge",
    name: "Grand forgeron",
    description: [FUSION.as("Colle"), " deux ou trois ", CARTE.as("cartes"), " du ", DECK, ", dans l'ordre choisi, jusqu'à trois fois."],
    icon: visual("halts/forge", { letter: "FO*" }),
    glow: GREAT_COLOR,
    transition: visual("great-door"),
    create: run => new GreatForgeHalt(run),
}

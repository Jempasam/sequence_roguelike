import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import { CARTE, DECK, MONSTER } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { deckNameOf } from "../../../run/deckName"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { AbstractHalt } from "../AbstractHalt"
import { decksShown } from "../shown"

/** Can a deck have two cards swapped? It takes two different cards at least. */
function canSwap(deck: readonly Card[]): boolean {
    return new Set(deck).size >= 2
}

/**
 * The prompter: two cards of a {@link DECK} trade places, since the monsters play their cards in the order of
 * the deck.
 */
export class PrompterHalt extends AbstractHalt {


    constructor(run: Run){
        super(PROMPTER_HALT, run,
            ["Chuchoter ", CARTE.as("cartes"), " à l'oreille d'un ", MONSTER, " : je change l'ordre, rien d'autre."],
            sceneLook(28, 30, 16, "strategist"),
            {
                hat: "bicorne",
                clothes: rgba(0.3, 0.45, 0.45),
                hatColor: rgba(0.1, 0.2, 0.25),
                item: "sword",
            },
        )
    }


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero("Pour qui ?", hero => this.#deck(ctx, hero, ask), {
            among: hero => hero.decks.some(canSwap),
        })
        ask()
    }


    /** Ask for the deck, then the two cards, and swap them. */
    #deck(ctx: HaltContext, hero: Hero, back: () => void): void {
        this.chooseDeck(ctx, ["Quel ", DECK, " ?"], hero, (deck, toDeck) => {
            const pool = [...new Set(deck)]
            ctx.cards(["Quelles deux ", CARTE.as("cartes"), " échanger ?"], pool, { min: 2, max: 2 }, ([first, second]) => {
                this.impact()
                this.run.changeDeck(deck, cards => {
                    const one = cards.indexOf(first)
                    const other = cards.indexOf(second)
                    cards[one] = second
                    cards[other] = first
                })
                ctx.tell(concat(first, " et ", second, " ont échangé leur place dans le ", deckNameOf(hero, deck), "."), decksShown(deck))
            }, { back: toDeck ?? back })
        }, { among: canSwap, back })
    }
}

/** The sort of the prompter. */
export const PROMPTER_HALT: HaltType = {
    id: "prompter",
    name: "Souffleur",
    description: ["Échange la place de deux ", CARTE.as("cartes"), " d'un ", DECK, " joué dans l'ordre."],
    icon: visual("halts/strategist", { letter: "SO" }),
    transition: visual("house-door"),
    create: run => new PrompterHalt(run),
}

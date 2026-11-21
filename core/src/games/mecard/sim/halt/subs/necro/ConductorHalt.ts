import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
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

/** Where a card may be sent in its deck. */
type Place = "first"|"last"

const PLACES: readonly Place[] = ["last", "first"]

/** What each place means, as the players are told. */
const PLACE_TEXTS: Readonly<Record<Place, string>> = {
    first: "Au début : elle sera jouée la première.",
    last: "À la fin : elle sera jouée la dernière.",
}

/** Can a deck have a card moved? It takes two cards at least. */
function canMove(deck: readonly Card[]): boolean {
    return deck.length >= 2
}

/**
 * The conductor: a card of a {@link DECK} is sent to its start or to its end, since the monsters play their
 * cards in the order of the deck.
 */
export class ConductorHalt extends AbstractHalt {


    constructor(run: Run){
        super(CONDUCTOR_HALT, run,
            ["Dans un ", DECK, " qui se joue dans l'ordre, tout est question de ", CARTE.as("cartes"), " bien placées."],
            sceneLook(28, 30, 16, "strategist"),
            {
                hat: "bicorne",
                clothes: rgba(0.45, 0.3, 0.6),
                hatColor: rgba(0.2, 0.1, 0.3),
                item: "sword",
            },
        )
    }


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero("Pour qui ?", hero => this.#deck(ctx, hero, ask), {
            among: hero => hero.decks.some(canMove),
        })
        ask()
    }


    /** Ask for the deck, then the card. */
    #deck(ctx: HaltContext, hero: Hero, back: () => void): void {
        this.chooseDeck(ctx, ["Quel ", DECK, " ?"], hero, (deck, toDeck) => {
            ctx.cards(["Quelle ", CARTE, " déplacer ?"], deck, { min: 1, max: 1 }, ([card]) => {
                this.#place(ctx, hero, deck, card, () => this.#deck(ctx, hero, back))
            }, { back: toDeck ?? back })
        }, { among: canMove, back })
    }

    /** Ask where the card goes, then send it there. */
    #place(ctx: HaltContext, hero: Hero, deck: Card[], card: Card, back: () => void): void {
        ctx.offer("Où ?", PLACES, place => ({ cards: [card], text: PLACE_TEXTS[place] }), place => {
            const at = deck.indexOf(card)
            if(at === (place === "first" ? 0 : deck.length - 1)){
                ctx.tell(concat(card, " est déjà ", place === "first" ? "au début" : "à la fin", " du ", deckNameOf(hero, deck), "."))
                return
            }
            this.impact()
            this.run.changeDeck(deck, cards => {
                cards.splice(cards.indexOf(card), 1)
                if(place === "first") cards.unshift(card)
                else cards.push(card)
            })
            ctx.tell(concat(card, " est placée ", place === "first" ? "au début" : "à la fin", " du ", deckNameOf(hero, deck), "."), decksShown(deck))
        }, { back })
    }
}

/** The sort of the conductor. */
export const CONDUCTOR_HALT: HaltType = {
    id: "conductor",
    name: "Chef d'orchestre",
    description: ["Envoie une ", CARTE, " au début ou à la fin d'un ", DECK, ", joué dans l'ordre."],
    icon: visual("halts/strategist", { letter: "CO" }),
    transition: visual("house-door"),
    create: run => new ConductorHalt(run),
}

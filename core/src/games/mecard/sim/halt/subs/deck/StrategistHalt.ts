import { concat, joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import { TACTICS_BOOK } from "../../../item/subs/stat/TacticsBook"
import { deckNameOf } from "../../../run/deckName"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { joinDecks, MAX_SWAPPED, splitDeck, swapCards } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { decksShown } from "../shown"
import { CARTE, DECK } from "../../../base/keywords"

/** What the strategist may do with the decks of a character. */
type StrategistPlan = "split"|"sort"|"join"|"draw"

const PLANS: readonly StrategistPlan[] = ["split", "sort", "join", "draw"]

/** What each plan does, as the players are told. */
const PLAN_TEXTS: Readonly<Record<StrategistPlan, Text>> = {
    split: ["Nouveau ", DECK, " : un ", DECK, " divisé en deux au hasard, puis des ", CARTE.as("cartes"), " échangées entre les deux."],
    sort: ["Trier : deux ", DECK.as("decks"), ", et jusqu'à ", MAX_SWAPPED, " ", CARTE.as("cartes"), " de chacun échangées."],
    join: ["Fusionner : deux ", DECK.as("decks"), " n'en font plus qu'un, et tu peux encore me demander quelque chose."],
    draw: concat("Piocher plus : ", TACTICS_BOOK, " : ", TACTICS_BOOK.description),
}

/** Can a deck be cut in two? */
function canSplit(deck: readonly Card[]): boolean {
    return deck.length >= 2
}

/** Can the strategist go through with a plan on the decks of a character? */
function can(hero: Hero, plan: StrategistPlan): boolean {
    switch(plan){
        case "split": return hero.decks.some(canSplit)
        case "sort":
        case "join": return hero.decks.length >= 2
        default: return true
    }
}

/** The strategist: a deck split in two at random, cards swapped between two, two joined, or an item. */
export class StrategistHalt extends AbstractHalt {


    constructor(run: Run){
        super(STRATEGIST_HALT, run,
            ["Deux ", DECK.as("decks"), " valent mieux qu'un. Je divise, je trie, je fusionne, ou je t'apprends à piocher."],
            // Waiting for its own art: the scene of the antiquarian.
            sceneLook(31, 26, 23, [
                "mecard/travel/antiquarian/1.png", "mecard/travel/antiquarian/2.png", "mecard/travel/antiquarian/3.png",
                "mecard/travel/antiquarian/4.png", "mecard/travel/antiquarian/5.png",
            ], "mecard/travel/antiquarian/border.png", haltPnj("strategist", [0.2, 0.3, 0.6], [0.8, 0.65, 0.25])),
        )
    }


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero("Pour qui ?", hero => this.#plan(ctx, hero, ask))
        ask()
    }


    /** Ask what to do with the decks of a character. */
    #plan(ctx: HaltContext, hero: Hero, back: () => void): void {
        const plans = PLANS.filter(plan => can(hero, plan))
        const ask = (): void => ctx.offer("Que faire ?", plans, plan => {
            return { cards: [], text: PLAN_TEXTS[plan] }
        }, plan => {
            if(plan === "split") this.#split(ctx, hero, ask)
            else if(plan === "sort") this.#sort(ctx, hero, ask)
            else if(plan === "join") this.#join(ctx, hero, ask, back)
            else this.#teach(ctx, hero)
        }, { back })
        ask()
    }

    /** Give a character the item to draw more: free here, since it takes the place of the other plans. */
    #teach(ctx: HaltContext, hero: Hero): void {
        this.impact()
        this.run.giveItem(hero, TACTICS_BOOK)
        ctx.tell(concat(TACTICS_BOOK, " pour ", hero, "."))
    }

    /**
     * Ask which deck to cut in two, then cut it, and show the two halves before the swap: nothing can be
     * taken back, so the swap has no way back.
     */
    #split(ctx: HaltContext, hero: Hero, back: () => void): void {
        this.chooseDeck(ctx, ["Quel ", DECK, " diviser ?"], hero, deck => {
            this.impact()
            const made = this.run.changeDeck(deck, changed => splitDeck(hero, changed, this.run.rng))
            this.run.deckChanged.notify(made)
            ctx.confirm(["Le ", DECK, " est divisé en deux, au hasard :"], decksShown(deck, made), "Échanger des cartes", () => {
                this.#swap(ctx, hero, deck, made)
            })
        }, { among: canSplit, back })
    }

    /** Ask which two decks to swap cards between. */
    #sort(ctx: HaltContext, hero: Hero, back: () => void): void {
        this.#twoDecks(ctx, hero, back, (first, second, toSecond) => {
            this.#swap(ctx, hero, first, second, toSecond)
        })
    }

    /**
     * Ask which two decks to join, the second into the first, then show what they made, and let the players
     * ask something else: the plans are asked again, and their way back leads to the other characters.
     *
     * @param back - The way back from asking for the decks.
     * @param toHeroes - The way back from the plans asked again.
     */
    #join(ctx: HaltContext, hero: Hero, back: () => void, toHeroes: () => void): void {
        this.#twoDecks(ctx, hero, back, (first, second) => {
            this.impact()
            this.run.changeDeck(first, kept => joinDecks(hero, kept, second))
            ctx.confirm(["Les deux ", DECK.as("decks"), " n'en font plus qu'un :"], decksShown(first), "Demander autre chose", () => {
                this.#plan(ctx, hero, toHeroes)
            })
        })
    }

    /** Ask for two decks of a character: not asked when there are only two. */
    #twoDecks(
        ctx: HaltContext, hero: Hero, back: () => void,
        done: (first: Card[], second: Card[], back?: () => void) => void,
    ): void {
        const [one, other] = hero.decks
        if(hero.decks.length === 2){
            done(one, other, back)
            return
        }
        this.chooseDeck(ctx, ["Quel premier ", DECK, " ?"], hero, (first, toFirst) => {
            this.chooseDeck(ctx, ["Quel second ", DECK, " ?"], hero, (second, toSecond) => {
                done(first, second, toSecond)
            }, { among: deck => deck !== first, ...toFirst ? { back: toFirst } : {} })
        }, { back })
    }

    /** Ask for cards of each of two decks, then swap them, and show the two decks as they now are. */
    #swap(ctx: HaltContext, hero: Hero, first: Card[], second: Card[], back?: () => void): void {
        const count = { min: 0, max: MAX_SWAPPED }
        const title = (deck: Card[]): Text => concat("Jusqu'à ", MAX_SWAPPED, " ", CARTE.as("cartes"), " du ", deckNameOf(hero, deck), " à échanger")
        const fromFirst = (): void => ctx.cards(title(first), first, count, leaving => {
            ctx.cards(title(second), second, count, coming => {
                if(leaving.length + coming.length === 0){
                    ctx.tell(["Les ", DECK.as("decks"), " de ", hero, " restent comme ils sont."])
                    return
                }
                this.impact()
                this.run.changeDeck(first, one => {
                    this.run.changeDeck(second, other => swapCards(one, leaving, other, coming))
                })
                ctx.tell(concat("Échangées : ", joinText([...leaving, ...coming], ", "), "."), decksShown(first, second))
            }, { back: fromFirst })
        }, back ? { back } : {})
        fromFirst()
    }
}

/** The sort of the strategist. */
export const STRATEGIST_HALT: HaltType = {
    name: "Stratège",
    description: ["Divise un ", DECK, " en deux, échange des ", CARTE.as("cartes"), " entre deux ", DECK.as("decks"), ", les fusionne, ou offre un objet qui fait piocher plus."],
    code: "ST",
    icon: "mecard/travel/strategist/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new StrategistHalt(run),
}

import type { Card } from "../../card/Card"
import type { Hero } from "../../run/Hero"
import type { HaltContext } from "../HaltContext"

import { AbstractHalt } from "./AbstractHalt"
import { DECK } from "../../base/keywords"

/** A halt working on one deck of one character, both asked first, among those it can work on. */
export abstract class DeckHalt extends AbstractHalt {


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero(["Le ", DECK, " de qui ?"], hero => {
            this.chooseDeck(ctx, ["Quel ", DECK, " ?"], hero, (deck, back) => this.work(ctx, deck, back ?? ask, hero), {
                among: deck => this.fits(deck), back: ask,
            })
        }, { among: hero => hero.decks.some(deck => this.fits(deck)) })
        ask()
    }

    /** Can the halt work on a deck? */
    protected abstract fits(deck: readonly Card[]): boolean

    /** Go on with a deck of a character, given the way back to the ask. */
    protected abstract work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void
}

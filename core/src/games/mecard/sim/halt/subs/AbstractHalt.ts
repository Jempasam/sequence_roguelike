import type { Text } from "../../../../../semantic"
import type { Card } from "../../card/Card"
import { firstDeck } from "../../run/Hero"
import type { Hero } from "../../run/Hero"
import type { Run } from "../../run/Run"
import type { Halt } from "../Halt"
import type { Choosing, HaltContext, Shown } from "../HaltContext"
import type { HaltType } from "../HaltType"
import { scenePnj } from "../SceneLook"
import type { SceneLook, ScenePnj } from "../SceneLook"
import { deckShown } from "./shown"

/**
 * What every halt shares: its sort, its line and its look, the run it changes, and remembering that it did.
 * A halt draws what it offers when it is made, so opening it again shows the same offers.
 */
export abstract class AbstractHalt implements Halt {


    /**
     * @param look - The scene it is visited over.
     * @param pnj - Its character as far as it differs from the default, none where nobody stands.
     */
    constructor(
        public readonly type: HaltType,

        /** The run it changes. */
        protected readonly run: Run,

        public readonly line: Text,
        look: SceneLook,
        pnj?: Partial<ScenePnj>,
    ){
        this.look = pnj ? { ...look, pnj: scenePnj(pnj) } : look
    }


    public readonly look: SceneLook


    public get title(): string { return this.type.name }

    public get hasImpact(): boolean { return this.#hasImpact }

    /** Free to leave by default. */
    public get locked(): boolean { return false }

    public abstract start(ctx: HaltContext): void

    /** Nothing to clean up by default. */
    public stop(ctx: HaltContext): void {
        void ctx
    }

    /**
     * Ask for a deck of a character, among those a test lets through: not asked when only one is, a first
     * one made for a character with none.
     *
     * @param done - Called with the deck, and the way back: to the ask when there was one.
     */
    protected chooseDeck(
        ctx: HaltContext, title: Text, hero: Hero, done: (deck: Card[], back?: () => void) => void,
        pick: Choosing<readonly Card[]> = {},
    ): void {
        firstDeck(hero)
        const decks = hero.decks.filter(deck => pick.among?.(deck) ?? true)
        if(decks.length <= 1){
            done(decks[0], pick.back)
            return
        }
        const show = (deck: Card[]): Shown => deckShown(hero, deck)
        const ask = (): void => ctx.offer(title, decks, show, deck => done(deck, ask), pick)
        ask()
    }

    /** Remember that the halt changes the run: each change a halt makes calls it. */
    protected impact(): void {
        this.#hasImpact = true
    }


    #hasImpact = false
}

import { concat } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { CARTE, DECK, MONSTER } from "../../../base/keywords"
import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import type { Monster } from "../../../catalog/monsters"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import type { SceneLook, ScenePnj } from "../../SceneLook"
import { AbstractHalt } from "../AbstractHalt"
import { offeredMonsters } from "../dark/monster_pool"

import type { MonsterOffer } from "./monsterCards"

/**
 * A halt that makes a card of monsters for a deck: a few cards are offered, each already made of a monster or
 * of several, and the one taken goes into the deck, with a key card if the deck holds none that can use it.
 */
export abstract class MonsterCardHalt extends AbstractHalt {


    constructor(type: HaltType, run: Run, line: Text, look: SceneLook, pnj: Partial<ScenePnj>){
        super(type, run, line, look, pnj)
        this.#offers = this.offered(run.rng)
    }


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero(["Le ", DECK, " de qui ?"], hero => {
            const chosen = (deck: Card[], back?: () => void): void => {
                this.#offer(ctx, hero, deck, back ?? ask)
            }
            this.chooseDeck(ctx, ["Quel ", DECK, " ?"], hero, chosen, { back: ask })
        })
        ask()
    }


    /** The key card given with it to a deck holding none that uses it, said in what each offer shows. */
    protected abstract readonly key: Card

    /**
     * The cards offered, each with the monsters it is made of, drawn when the halt is made: opened again, it
     * offers the same.
     */
    protected abstract offered(rng: Rng): readonly MonsterOffer[]

    /** One offer for each of a few monsters, each made a card by `make`. */
    protected offersOf(rng: Rng, make: (monster: Monster) => Card): MonsterOffer[] {
        return offeredMonsters(rng).map(monster => ({ sources: [monster], card: make(monster) }))
    }

    /**
     * Put the card made in a deck, with a key card first when the deck holds none that uses what it is.
     *
     * @returns The key given, none when the deck had one.
     */
    protected abstract receive(deck: Card[], card: Card): Card|null


    /** The cards offered, each with the monster it is made of. */
    readonly #offers: readonly MonsterOffer[]

    /** Ask for one of the cards for a deck of a character, then give it. */
    #offer(ctx: HaltContext, hero: Hero, deck: Card[], back: () => void): void {
        ctx.offer(concat("Quel ", MONSTER, " pour ", hero, " ?"), this.#offers, offer => this.#shown(offer), ({ card }) => {
            this.impact()
            const key = this.run.changeDeck(deck, cards => this.receive(cards, card))
            ctx.tell(key ? concat(hero, " reçoit ", card, " et ", key, ".") : concat(hero, " reçoit ", card, "."))
        }, { back })
    }

    /** An offer, the card it makes shown with the monster. */
    #shown({ sources, card }: MonsterOffer): Shown {
        const [first, second] = sources
        const made = second ? [first, " et ", second, " deviennent "] : [first, " devient "]
        return {
            cards: [card], sprite: first.sprite,
            text: [...made, card, ", avec ", this.key, " si le ", DECK, " n'a aucune ", CARTE, " qui l'utilise."],
        }
    }
}

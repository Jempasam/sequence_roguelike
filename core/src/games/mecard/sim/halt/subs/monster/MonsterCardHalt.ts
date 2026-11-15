import { concat } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
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
 * A halt that makes a card of a monster for a deck: a few monsters are offered, each already made a card, and
 * the one taken goes into the deck, with a key card if the deck holds none that can use it.
 */
export abstract class MonsterCardHalt extends AbstractHalt {


    constructor(type: HaltType, run: Run, line: Text, look: SceneLook, pnj: Partial<ScenePnj>){
        super(type, run, line, look, pnj)
        this.#offers = offeredMonsters(run.rng).map(monster => {
            return { monster, card: this.make(monster, run.rng) }
        })
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


    /** The card the monster is made, drawn when the halt is made so opening it again offers the same. */
    /** The key card given with it to a deck holding none that uses what it is, said in what each offer shows. */
    protected abstract readonly key: Card

    protected abstract make(monster: Monster, rng: Rng): Card

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
        ctx.offer(concat("Quel monstre pour ", hero, " ?"), this.#offers, offer => this.#shown(offer), ({ card }) => {
            this.impact()
            const key = this.run.changeDeck(deck, cards => this.receive(cards, card))
            ctx.tell(key ? concat(hero, " reçoit ", card, " et ", key, ".") : concat(hero, " reçoit ", card, "."))
        }, { back })
    }

    /** An offer, the card it makes shown with the monster. */
    #shown({ monster, card }: MonsterOffer): Shown {
        return { cards: [card], sprite: monster.sprite, text: [monster, " devient ", card, ", avec ", this.key, " si le ", DECK, " n'a aucune ", CARTE, " qui l'utilise."] }
    }
}

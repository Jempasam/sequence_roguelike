import { joinText } from "../../../../../../semantic"
import type { Action } from "../../../battle/Action"
import { composable } from "../../Card"
import type { Card } from "../../Card"
import { ACTION } from "../../CardType"
import type { CardType } from "../../CardType"
import { Rarity } from "../../Rarity"

import { THRUST } from "../attack/Thrust"
import { STEP } from "../movement/Step"
import { inOrder } from "../tools/sequence"
import { CompositeCard, requireComposable } from "./CompositeCard"
import type { CompositeLook } from "./CompositeCard"
import { MERGE } from "../../../base/keywords"

/** What a merged card is named by, between the names of its cards. */
const MERGED_JOIN = " & "

/**
 * Cards of actions played one after the other, as one step. Each gives an action, so none is a preparation,
 * which would only rewrite a chain. Those that take something all take the same kind of thing, as many as
 * there are: the merge then takes it, and hands it to each of them, the others taking nothing and playing on
 * their own.
 */
export class MergedCard extends CompositeCard<Action, unknown> {


    public readonly output = ACTION
    public readonly input: CardType<unknown>|null

    /**
     * @throws {@link Error} For less than two cards, when a card does not give actions, or when some take
     *   different kinds of things.
     */
    constructor(cards: readonly Card[], look: CompositeLook = {}){
        if(cards.length < 2) throw new Error(`A merge holds two cards at least, not ${cards.length}.`)
        requireComposable(cards)
        for(const card of cards){
            if(card.output !== ACTION){
                throw new Error(`${card.name} does not give actions: it cannot be played at once with another.`)
            }
        }
        const taking = cards.filter(card => card.input !== null)
        if(!mergeable(cards)){
            throw new Error(`A merge holds cards taking one kind of thing at most, not ${taking.map(card => `${card.name} (${card.input?.name})`).join(", ")}.`)
        }
        super(cards, MERGED_JOIN, contents => {
            const last = contents[contents.length - 1]
            return [
                MERGE.as("Mélange"), " : joue ", ...joinText(contents.slice(0, -1), ", "), " et ", last,
                " à la suite, en une seule étape.",
                ...taking.length > 0 ? [" Prend ce que prennent ", ...joinText(taking, ", "), "."] : [],
            ]
        }, look)
        this.input = taking[0]?.input ?? null
    }


    public with(cards: readonly Card[]): MergedCard {
        return new MergedCard(cards, this.look)
    }


    public get(input: unknown, tree: readonly Card[] = []): Action {
        // Each card taking something gets what the merge took, and what gave it, the others nothing.
        return inOrder(this.contents.map(card => {
            return (card.input === null ? card.get(undefined) : card.get(input, tree)) as Action
        }))
    }
}

/**
 * The one rule of every merge: can cards be played as a merge? Each gives an action, and those that take
 * something all take the same kind of thing, as many as there are. Fewer than two cards may be checked, for a
 * row that grows.
 */
export function mergeable(cards: readonly Card[]): boolean {
    if(!cards.every(card => card.output === ACTION && composable(card))) return false
    const taken = new Set(cards.map(card => card.input).filter(input => input !== null))
    return taken.size <= 1
}

/** What the cards of a merge take, all the same kind: nothing when none takes anything. */
export function mergedInput(cards: readonly Card[]): CardType<unknown>|null {
    return cards.find(card => card.input !== null)?.input ?? null
}

/** A step forward, thrusting as it goes. */
export const CHARGE = new MergedCard([STEP, THRUST], { name: "Charge", rarity: Rarity.RARE })

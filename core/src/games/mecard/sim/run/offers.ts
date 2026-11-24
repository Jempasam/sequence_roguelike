import type { Rng } from "../base/Rng"
import { ACTION, PREPARATION } from "../card/CardType"
import { signatureOf } from "../card/CardChain"
import type { Card } from "../card/Card"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { LOOT_CARDS } from "../catalog/index"

/** How many things a place offers to choose from. */
export const INVENTED_COUNTS = 3

/** How likely a fusion of the inventor holds a second tree after the first. */
const SECOND_TREE = 0.4

/** A card of the loot, the rare ones less often. */
export function lootCard(rng: Rng, pool: readonly Card[] = LOOT_CARDS): Card {
    const total = pool.reduce((sum, card) => sum + card.rarity.lootWeight, 0)
    let roll = rng.next() * total
    for(const card of pool){
        roll -= card.rarity.lootWeight
        if(roll < 0) return card
    }
    return pool[pool.length - 1]
}

/** Values all different, picked at random, as many as asked or as there are. */
export function distinct<T>(rng: Rng, values: readonly T[], count: number): T[] {
    const left = [...values]
    rng.shuffle(left)
    return left.slice(0, count)
}

/** Cards of the loot all different, the rare ones less often. */
export function lootCards(rng: Rng, count: number, pool: readonly Card[] = LOOT_CARDS): Card[] {
    const left = [...pool]
    const cards: Card[] = []
    while(cards.length < count && left.length > 0){
        const card = lootCard(rng, left)
        cards.push(card)
        left.splice(left.indexOf(card), 1)
    }
    return cards
}

/** The cards that can fill a slot taking a type: cards of the loot giving it, taking and holding nothing. */
export function fillersOf(type: Card["output"]): Card[] {
    return LOOT_CARDS.filter(card => {
        const { input, output } = signatureOf(card)
        return output === type && input === null && !card.contents
    })
}

/** Is a card played on its own, at the head of a row: does it truly give actions or a preparation? */
export function standing(card: Card): boolean {
    const { output } = signatureOf(card)
    return output === ACTION || output === PREPARATION
}

/** A tree of the loot, written as the cards in a row that read it: a card, then what fills its slots. */
function lootTree(rng: Rng): Card[] {
    const head = lootCard(rng)
    const cards = [head]
    const { input } = signatureOf(head)
    if(input) cards.push(lootCard(rng, fillersOf(input)))
    return cards
}

/**
 * A fusion of the inventor: a tree of the loot, the head of a row of cards giving actions or a preparation
 * effect, and maybe another one after it. Its cards always read whole.
 */
export function inventedFusion(rng: Rng): Card {
    const trees = [standingTree(rng)]
    if(trees[0].length < 2 || rng.chance(SECOND_TREE)) trees.push(standingTree(rng))
    return new FusionCard(trees.flat())
}

/** A tree of the loot that is played on its own: not an element alone. */
function standingTree(rng: Rng): Card[] {
    for(;;){
        const tree = lootTree(rng)
        if(standing(tree[0])) return tree
    }
}

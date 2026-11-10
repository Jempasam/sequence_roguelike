import type { Rng } from "../base/Rng"
import { ACTION, PREPARATION } from "../card/CardType"
import { CardChain, signatureOf } from "../card/CardChain"
import type { Card } from "../card/Card"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { LOOT_CARDS } from "../catalog/index"
import type { Monster } from "../catalog/monsters"
import { AimCard } from "../card/subs/movement/Aim"
import { STEP } from "../card/subs/movement/Step"
import { CHAIN_SIZE } from "../battle/Unit"

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

/** Is a card one that only goes or aims: no card a fusion of a monster is named after? */
function plain(card: Card): boolean {
    return card === STEP || card instanceof AimCard
}

/**
 * The chains a monster plays, round after round: its deck, kept in order, cut in hands of what it draws, each
 * read from left to right as a bot reads it. Every start of a hand in its deck once.
 */
export function monsterChains(monster: Monster): Card[][] {
    const { cards, draw } = monster
    if(cards.length === 0 || draw <= 0) return []
    const chains: Card[][] = []
    const seen = new Set<number>()
    for(let start = 0; !seen.has(start); start = (start + draw) % cards.length){
        seen.add(start)
        const hand = Array.from({ length: Math.min(draw, cards.length) }, (_, index) => cards[(start + index) % cards.length])
        chains.push([...CardChain.leftToRight(hand, CHAIN_SIZE).cards])
    }
    return chains
}

/**
 * A fusion of a monster: one of the chains it plays, in order, named after its rarest card that does more than
 * go or aim and after the monster, "Estoc de Gobelin". None when it plays only steps and aims.
 */
export function monsterFusion(monster: Monster, rng: Rng): Card|null {
    const chains = monsterChains(monster).filter(chain => chain.length >= 2 && chain.some(card => !plain(card)))
    const chain = rng.pick(chains)
    if(!chain) return null
    const main = chain.filter(card => !plain(card)).reduce((best, card) => card.rarity.rank > best.rarity.rank ? card : best)
    return new FusionCard(chain, { name: `${main.name} de ${monster.name}` })
}

/** A tree of the loot that is played on its own: not an element alone. */
function standingTree(rng: Rng): Card[] {
    for(;;){
        const tree = lootTree(rng)
        if(standing(tree[0])) return tree
    }
}

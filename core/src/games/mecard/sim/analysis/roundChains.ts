import { CHAIN_SIZE } from "../battle/Unit"
import type { Card } from "../card/Card"
import { CardChain } from "../card/CardChain"
import { AimCard } from "../card/subs/movement/Aim"
import { STEP } from "../card/subs/movement/Step"

/**
 * Is a card one that only goes or aims: no card a fusion is named after, no chain made of them says
 * anything.
 */
export function plain(card: Card): boolean {
    return card === STEP || card instanceof AimCard
}

/**
 * The chains a deck plays, round after round: its cards kept in order, cut in hands of what it draws, each
 * read from left to right as a bot reads it. Every start of a hand in the deck once.
 */
export function roundChains(cards: readonly Card[], draw: number): Card[][] {
    if(cards.length === 0 || draw <= 0) return []
    const chains: Card[][] = []
    const seen = new Set<number>()
    for(let start = 0; !seen.has(start); start = (start + draw) % cards.length){
        seen.add(start)
        const hand = Array.from({ length: Math.min(draw, cards.length) }, (_, index) => {
            return cards[(start + index) % cards.length]
        })
        chains.push([...CardChain.leftToRight(hand, CHAIN_SIZE).cards])
    }
    return chains
}

/**
 * What a fusion of a chain is called: its rarest card that does more than go or aim, and the unit it comes
 * from, "Estoc de Gobelin".
 *
 * @returns None when the chain holds only steps and aims.
 */
export function fusionName(chain: readonly Card[], unitName: string): string|null {
    const named = chain.filter(card => !plain(card))
    if(named.length === 0) return null
    const main = named.reduce((best, card) => card.rarity.rank > best.rarity.rank ? card : best)
    return `${main.name} de ${unitName}`
}

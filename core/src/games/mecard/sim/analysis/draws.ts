import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"

/**
 * The cards of the pools of a booster as one chain, alternating the pools: the first card of the first pool,
 * of the second, of the third, then the second card of each, and so on. A pool that has run out is skipped.
 * So cards of a same pool are never next to each other while the other pools still hold some.
 */
export function alternated(pools: readonly (readonly Card[])[]): Card[] {
    const chain: Card[] = []
    const longest = Math.max(0, ...pools.map(pool => pool.length))
    for(let index = 0; index < longest; index++){
        for(const pool of pools){
            if(index < pool.length) chain.push(pool[index])
        }
    }
    return chain
}

/**
 * Does every draw of a booster read whole? A draw takes one card of each pool, in the order of the pools, as
 * the links of a chain: so each pool must hold cards that can all stand in the same place of it.
 */
export function everyDrawReads(pools: readonly (readonly Card[])[]): boolean {
    const reads = (drawn: readonly Card[], rest: readonly (readonly Card[])[]): boolean => {
        if(rest.length === 0) return readsWhole(drawn)
        return rest[0].every(card => reads([...drawn, card], rest.slice(1)))
    }
    return pools.length > 0 && pools.every(pool => pool.length > 0) && reads([], pools)
}

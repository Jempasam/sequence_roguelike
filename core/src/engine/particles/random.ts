/** A source of numbers from 0 included to 1 excluded. The engine never reads `Math.random` itself. */
export type Random = () => number

/** One of the items, drawn from the random. */
export function pick<T>(random: Random, items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(random() * items.length))]
}

/** Two different items, drawn from the random: both the same when there is one. */
export function pickTwo<T>(random: Random, items: readonly T[]): [T, T] {
    const first = Math.min(items.length - 1, Math.floor(random() * items.length))
    if(items.length < 2) return [items[first], items[first]]
    let second = Math.min(items.length - 2, Math.floor(random() * (items.length - 1)))
    if(second >= first) second++
    return [items[first], items[second]]
}

/**
 * A small seeded generator (mulberry32), for what is only displayed. It is not the generator of the
 * simulation: drawing from that one for a visual would change the replays.
 */
export function seededRandom(seed: number): Random {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

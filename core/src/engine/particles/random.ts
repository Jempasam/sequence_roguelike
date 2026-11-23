/** A source of numbers from 0 included to 1 excluded. The engine never reads `Math.random` itself. */
export type Random = () => number

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

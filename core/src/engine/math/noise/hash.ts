/**
 * Mix whole numbers into one unsigned 32-bit number. The same numbers always give the same result, and a
 * change of any of them changes the result unpredictably: it names a thing from the names of what holds it.
 */
export function hash32(...values: number[]): number {
    let h = 0x9e3779b9
    for(const value of values){
        h = Math.imul(h ^ (value | 0), 0x85ebca6b)
        h ^= h >>> 13
        h = Math.imul(h, 0xc2b2ae35)
        h ^= h >>> 16
    }
    return h >>> 0
}

/** The unit hash of four whole numbers, without allocating: the one the noise calls in its inner loop. */
export function hashCell(a: number, b: number, c: number, d: number): number {
    let h = 0x9e3779b9
    h = Math.imul(h ^ (a | 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    h = Math.imul(h ^ (b | 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    h = Math.imul(h ^ (c | 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    h = Math.imul(h ^ (d | 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

/** Mix whole numbers into a number from 0 included to 1 excluded. */
export function hashUnit(...values: number[]): number {
    return hash32(...values) / 4294967296
}

/** The 32-bit hash of a text, to turn a name into a number that {@link hash32} can mix. */
export function hashText(text: string): number {
    let h = 0x811c9dc5
    for(let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
    return h >>> 0
}

/**
 * The seeded random numbers of a battle (mulberry32): the same seed always gives the same battle, which
 * replays and the authority of the host rest on.
 */
export class Rng {


    constructor(seed: number){
        this.#state = seed >>> 0
    }


    /** The state, enough to resume the same sequence. */
    public get state(): number { return this.#state }

    public set state(state: number){
        this.#state = state >>> 0
    }

    /** A number in [0, 1). */
    public next(): number {
        this.#state = (this.#state + 0x6D2B79F5) >>> 0
        let t = this.#state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    /** A whole number in [0, count). */
    public int(count: number): number {
        return Math.floor(this.next() * count)
    }

    /** Does an event of this probability happen? */
    public chance(probability: number): boolean {
        return this.next() < probability
    }

    /** One of the items, none for none. */
    public pick<T>(items: readonly T[]): T|undefined {
        return items[this.int(items.length)]
    }

    /** Shuffle a list in place. */
    public shuffle<T>(items: T[]): void {
        for(let i = items.length - 1; i > 0; i--){
            const j = this.int(i + 1)
            const swapped = items[i]
            items[i] = items[j]
            items[j] = swapped
        }
    }


    #state: number
}

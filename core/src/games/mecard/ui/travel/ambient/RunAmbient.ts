import type { Random } from "../../../../../engine/particles"
import type { AmbientContext } from "./AmbientContext"
import type { AmbientEffect } from "./AmbientEffect"
import type { AmbientOutcome, AmbientPool } from "./AmbientPool"

/** Which pools may start the effects a space opens with. */
export interface Opening {
    /** The pools by rank: each rank starts one effect, by the first of its pools, in a random order. */
    readonly ranks: readonly (readonly AmbientPool[])[]

    readonly random: Random
}

/** The ambient of a run: pools that each have their own wait, limit and spacings. */
export class RunAmbient {

    constructor(
        public readonly pools: readonly AmbientPool[],

        /** What starts when a space opens, nothing by default. */
        public readonly opening: Opening|null = null,
    ){}

    /** How many animations are playing, in all the pools. */
    public get playing(): number {
        return this.pools.reduce((sum, pool) => sum + pool.playing, 0)
    }

    /** Move the pools on. */
    public update(dt: number, context: AmbientContext): void {
        for(const pool of this.pools) pool.update(dt, context)
    }

    /**
     * Start at once one effect for each rank of the {@link Opening}, when a pool of the rank can.
     *
     * @returns Did one start?
     */
    public open(context: AmbientContext): boolean {
        const { opening } = this
        if(!opening) return false
        let opened = false
        for(const rank of opening.ranks){
            const left = [...rank]
            while(left.length > 0){
                const [pool] = left.splice(Math.floor(opening.random() * left.length), 1)
                if(!pool.draw(context)) continue
                opened = true
                break
            }
        }
        return opened
    }

    /**
     * Start effects at once, each by the pool that holds it, whatever the wait.
     *
     * @returns What became of each, in the order asked. An effect no pool holds is told unplayable.
     */
    public trigger(context: AmbientContext, effects: readonly AmbientEffect[]): AmbientOutcome[] {
        return effects.map((effect): AmbientOutcome => {
            const pool = this.pools.find(each => each.effects.includes(effect))
            if(!pool) return { effect, status: "unplayable" }
            return pool.trigger(context, [effect])[0]
        })
    }

    /** End what plays in every pool. */
    public stop(): void {
        for(const pool of this.pools) pool.stop()
    }
}

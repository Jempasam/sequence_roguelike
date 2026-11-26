import type { Effect } from "../../../../../engine/animation"
import type { AmbientContext } from "./AmbientContext"

/** What makes an ambient effect. */
export interface AmbientEffectOptions {
    readonly id: string

    /** Seconds to wait before another one, from the end of the last one (from its start if stackable). */
    readonly spacing: number

    /** Whether several may play at once. When not, the next one waits for the end of the last. */
    readonly stackable: boolean

    /** Whether it can play on this map. */
    readonly isPlayable: (context: AmbientContext) => boolean

    /** How likely it is, relative to the other playable ones. */
    readonly weight: (context: AmbientContext) => number

    /** What makes its animation. */
    readonly effect: Effect<AmbientContext>
}

/** A sort of ambient effect: when it may play, and what makes its animation. */
export class AmbientEffect {

    public readonly id: string
    public readonly spacing: number
    public readonly stackable: boolean
    public readonly effect: Effect<AmbientContext>

    constructor(private readonly options: AmbientEffectOptions){
        this.id = options.id
        this.spacing = options.spacing
        this.stackable = options.stackable
        this.effect = options.effect
    }

    /** Whether it can play on this map. */
    public isPlayable(context: AmbientContext): boolean {
        return this.options.isPlayable(context)
    }

    /** How likely it is, relative to the other playable ones. */
    public weight(context: AmbientContext): number {
        return this.options.weight(context)
    }
}

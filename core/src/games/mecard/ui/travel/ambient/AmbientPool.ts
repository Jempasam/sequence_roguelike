import { Animator } from "../../../../../engine/animation"
import type { Random } from "../../../../../engine/particles"
import type { AmbientContext } from "./AmbientContext"
import type { AmbientEffect } from "./AmbientEffect"

/** What became of an effect asked to start. */
export type AmbientStatus = "started" | "unplayable" | "failed"

/** What became of an effect asked to start, told to whoever asked. */
export interface AmbientOutcome {
    readonly effect: AmbientEffect
    readonly status: AmbientStatus
}

/**
 * Starts one of its effects at random every few seconds, by weight, among the playable ones that are not
 * waiting for their spacing, and plays them with an {@link Animator}. Its wait, its limit and the spacings
 * are its own: several pools live side by side.
 */
export class AmbientPool {


    constructor(
        public readonly effects: readonly AmbientEffect[],
        public readonly random: Random,

        /** The shortest and the longest wait between two tries, in seconds. */
        public readonly interval: readonly [number, number],

        /** The most animations playing at once. */
        public readonly maxPlaying: number,

        report: (error: unknown) => void,
    ){
        this.#animator = new Animator(report)
        this.#countdown = this.#wait()
    }


    /** How many animations are playing. */
    public get playing(): number {
        return this.#animator.playing
    }

    /** Move the animations on, count the spacings down, and start an effect when its time comes. */
    public update(dt: number, context: AmbientContext): void {

        // SPACINGS //
        for(const [effect, left] of this.#ready) this.#ready.set(effect, Math.max(0, left - dt))

        // PLAYING //
        this.#animator.update(dt)

        // WAIT //
        this.#countdown -= dt
        if(this.#countdown > 0) return
        this.#countdown = this.#wait()

        // DRAW //
        if(this.#animator.playing >= this.maxPlaying) return
        const candidates = this.effects.filter(effect => {
            return this.#available(effect) && effect.isPlayable(context)
        })
        const weights = candidates.map(effect => Math.max(0, effect.weight(context)))
        const total = weights.reduce((sum, weight) => sum + weight, 0)
        if(total <= 0) return
        let pick = this.random() * total
        let chosen = weights.findIndex(weight => (pick -= weight) < 0)
        if(chosen < 0) chosen = weights.length - 1
        this.#start(candidates[chosen], context)
    }

    /**
     * Start effects at once, whatever the wait, the limit and the spacing.
     *
     * @returns What became of each, in the order asked.
     */
    public trigger(context: AmbientContext, effects: readonly AmbientEffect[]): AmbientOutcome[] {
        return effects.map((effect): AmbientOutcome => {
            if(!effect.isPlayable(context)) return { effect, status: "unplayable" }
            return { effect, status: this.#start(effect, context) ? "started" : "failed" }
        })
    }

    /** End what plays and forget the spacings. */
    public stop(): void {
        this.#animator.stop()
        this.#ready.clear()
        this.#countdown = this.#wait()
    }


    readonly #animator: Animator

    /** The seconds each effect still has to wait before it may play again. */
    readonly #ready = new Map<AmbientEffect, number>()

    /** How many animations of each effect are playing. */
    readonly #running = new Map<AmbientEffect, number>()

    #countdown: number

    #wait(): number {
        const [low, high] = this.interval
        return low + this.random() * (high - low)
    }

    /** May it start: no other one plays unless it stacks, and its spacing is gone. */
    #available(effect: AmbientEffect): boolean {
        if(!effect.stackable && (this.#running.get(effect) ?? 0) > 0) return false
        return (this.#ready.get(effect) ?? 0) <= 0
    }

    /** Make the animation of an effect and play it. @returns False when it finally cannot. */
    #start(effect: AmbientEffect, context: AmbientContext): boolean {
        const animation = effect.effect.create(context)
        if(!animation) return false
        this.#running.set(effect, (this.#running.get(effect) ?? 0) + 1)
        if(effect.stackable) this.#ready.set(effect, effect.spacing)
        this.#animator.play(animation, () => {
            const left = (this.#running.get(effect) ?? 1) - 1
            if(left > 0) this.#running.set(effect, left)
            else this.#running.delete(effect)
            if(!effect.stackable) this.#ready.set(effect, effect.spacing)
        })
        return true
    }
}

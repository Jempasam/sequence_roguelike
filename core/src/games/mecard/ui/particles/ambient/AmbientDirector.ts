import type { Random } from "../../../../../engine/particles"
import type { AmbientEffect, AmbientMap, AmbientParticles, AmbientPlay } from "./AmbientEffect"

/** The shortest and the longest wait between two tries, in seconds. */
export const AMBIENT_DELAY: readonly [number, number] = [6, 15]

/** The most effects playing at once. */
export const MAX_PLAYING = 2

/** What became of an effect asked to start, told to whoever asked. */
export interface AmbientOutcome {
    readonly effect: AmbientEffect

    /** Why it did not start, or that it did. */
    readonly status: string
}

/**
 * Starts an ambient effect every few seconds, drawn among the ones the map allows, and moves the effects
 * playing on.
 */
export class AmbientDirector {

    constructor(
        public readonly effects: readonly AmbientEffect[],
        public readonly random: Random,
        public readonly delay: readonly [number, number] = AMBIENT_DELAY,
        public readonly maxPlaying = MAX_PLAYING,
    ){
        this.#countdown = this.#wait()
    }

    /** How many effects are playing. */
    public get playing(): number {
        return this.#playing.length
    }

    /** Move the effects on, and start one when its time comes. */
    public update(dt: number, map: AmbientMap, particles: AmbientParticles): void {

        // PLAYING //
        this.#playing = this.#playing.filter(play => play.update(dt))

        // WAIT //
        this.#countdown -= dt
        if(this.#countdown > 0) return
        this.#countdown = this.#wait()

        // DRAW //
        if(this.#playing.length >= this.maxPlaying) return
        const weights = this.effects.map(effect => Math.max(0, effect.weight(map)))
        const total = weights.reduce((sum, weight) => sum + weight, 0)
        if(total <= 0) return
        let pick = this.random() * total
        let chosen = weights.findIndex(weight => (pick -= weight) < 0)
        if(chosen < 0) chosen = weights.length - 1
        const play = this.effects[chosen].start(map, particles)
        if(play) this.#playing.push(play)
    }

    /**
     * Start effects at once, whatever the wait and the limit of effects playing, the wait left as it is.
     *
     * @returns What became of each, in the order asked.
     */
    public trigger(
        map: AmbientMap, particles: AmbientParticles, effects: readonly AmbientEffect[],
    ): AmbientOutcome[] {
        return effects.map(effect => {
            if(effect.weight(map) <= 0) return { effect, status: "impossible sur cette carte" }
            const play = effect.start(map, particles)
            if(!play) return { effect, status: "rien à jouer (sprites pas chargés ?)" }
            this.#playing.push(play)
            return { effect, status: "lancé" }
        })
    }

    /** Forget the effects playing: the particles they made end by themselves. */
    public stop(): void {
        this.#playing = []
        this.#countdown = this.#wait()
    }


    #playing: AmbientPlay[] = []
    #countdown: number

    #wait(): number {
        const [low, high] = this.delay
        return low + this.random() * (high - low)
    }
}

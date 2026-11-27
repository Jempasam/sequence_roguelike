import type { Painter } from "../../../../../engine/gpu"
import { MAX_STEP, ParticleSystem } from "../../../../../engine/particles"
import type { Random } from "../../../../../engine/particles"
import type { AmbientContext } from "./AmbientContext"
import type { AmbientEffect } from "./AmbientEffect"
import type { AmbientOutcome } from "./AmbientPool"
import { runAmbient } from "./pools"
import { scaledContext } from "./scaledContext"

/** The most ambient particles alive at once, for each way they blend. */
export const MAX_AMBIENT_PARTICLES = 512

/** A space being decorated. */
interface Decorated {
    readonly context: AmbientContext

    /** The same space as the effects see it, at its scale. */
    readonly view: AmbientContext

    readonly scene: object
}

/**
 * Plays ambient effects in the first enabled space of those it is given, such as the map of a journey or the
 * ground of a battle. A space starts with effects at once, and what plays ends when it is left.
 *
 * @remarks
 * It moves on by steps as long as those of the particles at most, so it keeps their pace.
 */
export class Ambient {


    /** The spaces it may decorate, set by whoever shows them: the first one enabled is. */
    public contexts: readonly AmbientContext[] = []

    /** The particles that blend normally. */
    public readonly alpha = new ParticleSystem(MAX_AMBIENT_PARTICLES)

    /** The particles that glow. */
    public readonly additive = new ParticleSystem(MAX_AMBIENT_PARTICLES, { blend: "additive" })

    constructor(
        /** The randomness of the display, apart from the run. */
        public readonly random: Random,

        /** Where the error of an animation goes. */
        report: (error: unknown) => void,
    ){
        this.#effects = runAmbient(random, report)
    }


    /** Are there particles alive? */
    public get active(): boolean {
        return this.alpha.count > 0 || this.additive.count > 0
    }

    /** Move the effects and the particles on, in the space shown. */
    public update(dt: number): void {
        const shown = this.#enabled()

        // LEFT //
        const scene = shown?.scene() ?? null
        if(this.#decorated && this.#decorated.scene !== scene) this.stop()

        // OPENED //
        if(shown && scene && !this.#decorated && shown.settled()){
            const view = scaledContext(shown)
            this.#decorated = { context: shown, view, scene }
            this.#effects.open(view)
        }

        // PLAYING //
        if(!this.#decorated) return
        const step = Math.min(dt, MAX_STEP)
        this.#effects.update(step, this.#decorated.view)
        this.alpha.update(step)
        this.additive.update(step)
    }

    /**
     * Start effects now in the space shown, for a try, whatever the wait.
     *
     * @throws {@link Error} When no space is enabled.
     */
    public trigger(effects: readonly AmbientEffect[]): AmbientOutcome[] {
        const shown = this.#enabled()
        if(!shown) throw new Error("Ni carte ni arène affichée : reviens à la carte avec travel show.")
        return this.#effects.trigger(scaledContext(shown), effects)
    }

    /** Draw the particles, at the scale of the space. */
    public draw(painter: Painter): void {
        const scale = this.#decorated?.view.scale ?? 1
        painter.push()
        painter.scale(scale)
        this.alpha.draw(painter)
        this.additive.draw(painter)
        painter.pop()
    }

    /** End what plays and remove every particle. The waits of the pools are kept. */
    public stop(): void {
        this.#decorated = null
        this.#effects.stop()
        this.alpha.clear()
        this.additive.clear()
    }


    readonly #effects: ReturnType<typeof runAmbient>

    /** The space being decorated, none while none is. */
    #decorated: Decorated|null = null

    #enabled(): AmbientContext|null {
        return this.contexts.find(each => each.enabled()) ?? null
    }
}

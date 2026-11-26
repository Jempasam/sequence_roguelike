import type { Point } from "../../../../../../engine/math"
import { radial } from "../../../particles/recipes"
import type { Look, Spread } from "../../../particles/recipes"
import type { AmbientContext } from "../AmbientContext"

/** Particles thrown at once out of a point: a splash, a puff, a flash. */
export interface Jet {
    readonly count: number
    readonly look: Look
    readonly spread: Spread

    /** Does it glow? */
    readonly glow?: boolean
}

/** Throw jets out of a point, in the order given. */
export function throwJets(context: AmbientContext, at: Point, jets: readonly Jet[]): void {
    for(const jet of jets){
        const system = jet.glow ? context.additive : context.alpha
        radial(system, context.random, at, jet.count, jet.look, jet.spread)
    }
}

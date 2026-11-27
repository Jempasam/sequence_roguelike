import type { Animation } from "../../../../../../engine/animation"
import type { AmbientContext } from "../AmbientContext"
import type { Tracked } from "./Tracked"

/**
 * An animation over units: at each frame they are read again, then `step` is given the time of the frame and
 * the age. It is over when its time is, or when `step` answers false.
 *
 * @param step - It is called one last time at the age the animation ends, to put away what it shows.
 */
export function following(
    context: AmbientContext, units: readonly Tracked[], duration: number,
    step: (dt: number, age: number) => boolean|void,
): Animation {
    let age = 0
    return {
        start(){
            age = 0
        },
        update(dt){
            age += dt
            const shown = context.units()
            for(const unit of units) unit.update(dt, shown)
            const going = step(dt, age) !== false
            return going && age < duration
        },
        end(){},
    }
}

/** How much of something is seen at an age of a play: it appears at its start and fades before its end. */
export function envelope(age: number, duration: number, fade: number): number {
    return Math.max(0, Math.min(1, age / fade, (duration - age) / fade))
}

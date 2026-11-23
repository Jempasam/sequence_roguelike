import { instant } from "../../../../engine/ui"
import type { Animation, AnimationChain } from "../../../../engine/ui"
import type { Observable, Observer } from "../../sim/base/Observable"
import type { ForwardPhase, Forwarded } from "./Forwarded"

/** What tells that the animation of an event starts or ends. */
export type Tell = (phase: ForwardPhase) => void

/** What tells a {@link Forwarded} of the event of an observable, nothing when there is none. */
export function telling<T>(forwarded: Forwarded|null, observable: Observable<T>, value: T): Tell {
    return phase => forwarded?.forward(observable, value, phase)
}

/** An animation that tells it starts, then that it ends. */
export function forwarding(tell: Tell, animation: Animation): Animation {
    return async() => {
        tell("start")
        await animation()
        tell("end")
    }
}

/**
 * Add to a chain what an observable tells, each event an animation of its own, forwarded as it plays. Without
 * an animation, the event only takes its place in the chain, forwarded when its turn comes: with nothing to
 * forward to, it is not even added.
 *
 * @returns What removes the listening.
 */
export function animate<T>(
    chain: AnimationChain,
    forwarded: Forwarded|null,
    observable: Observable<T>,
    build?: (value: T) => Animation,
): Observer {
    if(!build && !forwarded) return { remove: () => {} }
    return observable.add(value => {
        chain.add(forwarding(telling(forwarded, observable, value), build ? build(value) : instant(() => {})))
    })
}

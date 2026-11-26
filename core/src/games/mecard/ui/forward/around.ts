import { instant } from "../../../../engine/ui"
import type { UiAnimation, AnimationChain } from "../../../../engine/ui"
import type { Observer } from "../../sim/base/Observable"
import type { AnyObservable, ForwardPhase, Forwarded } from "./Forwarded"

/** What holds the animations of the events of some observables, before they are forwarded. */
export type Holds = ReadonlyMap<AnyObservable, UiAnimation>

/**
 * Forward each event of some observables to a chain, an animation of its own before what a screen adds for
 * it, and another after: the first tells it starts, the second that it ends.
 *
 * @remarks
 * The listeners of an observable are called in the order they were added, so what is added by `install`
 * stands between the two. It is called here, rather than by the screen after, so nothing can be added after
 * the end of the event.
 *
 * @param chain - Where the screen adds its animations.
 * @param forwarded - What is told, nothing to tell when there is none.
 * @param observables - What is forwarded, whether or not the screen shows it.
 * @param install - What the screen adds to its chain for the events, the observers it made.
 * @param holds - For some observables, what the chain waits for before the event starts, such as the end of
 *   a pause. It is added even when there is nothing to tell.
 * @returns Every observer made, what removes the listening.
 */
export function forwardAround(
    chain: AnimationChain,
    forwarded: Forwarded|null,
    observables: readonly AnyObservable[],
    install: () => Observer[],
    holds: Holds = new Map(),
): Observer[] {
    const before: Observer[] = []
    const after: Observer[] = []
    for(const observable of observables){
        const hold = holds.get(observable)
        if(!hold && !forwarded) continue
        before.push(observable.add(value => {
            if(hold) chain.add(hold)
            if(forwarded) chain.add(telling(forwarded, observable, value, "start"))
        }))
    }
    const installed = install()
    if(forwarded){
        for(const observable of observables){
            after.push(observable.add(value => {
                chain.add(telling(forwarded, observable, value, "end"))
            }))
        }
    }
    return [...before, ...installed, ...after]
}

/** An animation that tells, when its turn comes, that an event starts or ends. */
function telling(
    forwarded: Forwarded,
    observable: AnyObservable,
    value: unknown,
    phase: ForwardPhase,
): UiAnimation {
    return instant(() => forwarded.forward(observable, value, phase))
}

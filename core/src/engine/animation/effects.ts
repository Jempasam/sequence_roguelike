import { animationFn } from "./animations"
import type { Effect } from "./Effect"

/**
 * An effect written as a generator function of its context: each animation it makes is an
 * {@link animationFn} that runs the generator, given the context when the animation starts.
 */
export function effectFn<C>(make: (context: C) => Generator<void, void, number>): Effect<C> {
    return {
        create: context => animationFn(() => make(context)),
    }
}

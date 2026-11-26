/**
 * @packageDocumentation
 * Things that move on with time, from a start to an end. An {@link Animation} is moved on by hand, frame
 * after frame; an {@link Animator} plays many of them at once, and ends each once whatever the way it ends.
 * An {@link Effect} makes an animation of what it is given. The helpers build animations from functions
 * ({@link timed}, {@link once}, {@link animationFn}) or from other animations ({@link together},
 * {@link after}, {@link queue}), and {@link effectFn} builds an effect from a generator function.
 *
 * Nothing here knows what the animations draw: the context is the caller's.
 */

export type { Animation } from "./Animation"
export { Animator } from "./Animator"
export { animationFn, after, once, queue, timed, together } from "./animations"
export type { Effect } from "./Effect"
export { effectFn } from "./effects"

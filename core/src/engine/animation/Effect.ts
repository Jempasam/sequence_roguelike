import type { Animation } from "./Animation"

/** What makes an animation of what it is given. `C` is what the animation reads and draws in. */
export interface Effect<C> {

    /** Make it, or none when it finally cannot (sprites not loaded). */
    create(context: C): Animation|null
}

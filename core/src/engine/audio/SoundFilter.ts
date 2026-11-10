import type { AudioStage, FilterContext } from "../../platform"

/**
 * A change made to a sound on its way to the speakers: a muffling, an echo, a room.
 *
 * @remarks
 * A filter holds its numbers and builds its stage when a sound is played, since a stage serves one sound
 * only. What the stage is made of is up to the {@link FilterContext}, so no filter knows a node of any
 * audio library.
 */
export interface SoundFilter {
    /** Make the stage that applies the filter to one sound. */
    build(context: FilterContext): AudioStage
}

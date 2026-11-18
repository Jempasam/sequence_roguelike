import { Box } from "./Box"
import { Disk } from "./Disk"
import type { Hitbox, SavedHitbox } from "./Hitbox"

/**
 * The shape a save wrote down.
 *
 * @throws {@link Error} For a kind of shape this version does not know.
 */
export function loadedHitbox([kind, ...measures]: SavedHitbox): Hitbox {
    if(kind === "disk" && measures.length === 1) return new Disk(measures[0])
    if(kind === "box" && measures.length === 2) return new Box(measures[0], measures[1])
    throw new Error(`No shape is written as "${kind}" with ${measures.length} measures: the save comes from another version.`)
}

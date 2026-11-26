import { Vec3 } from "../../../engine/math"
import type { Level } from "../level/Level"
import { Pose } from "../level/Pose"
import type { Address } from "../level/Pose"
import type { Space } from "./Space"

/**
 * A point put in space. It is a position in the level it was put in, under the places of the levels above:
 * it stays still for anyone who looks at that level, and moves with its places for anyone who looks from a
 * larger one. To show it, it is converted up to the place it shares with where the player is, then down to
 * the current level.
 */
export class Anchor {


    constructor(
        /** The levels the point was under, from the whole to the level it was put in. */
        public readonly levels: readonly Level[],

        /** The place of each of these levels, as the level addresses it. */
        public readonly ats: readonly Address[],

        /** The position, in the units of the last level. */
        public readonly position: Vec3,
    ){}


    /** Where the point is, in the units of the current level of a space, at a time in seconds. */
    public in(space: Space, time: number): Vec3 {
        const chain = space.chain
        const deepest = this.levels.length - 1
        const current = chain.length - 1
        let common = 0
        const shared = Math.min(deepest, current)
        while(common < shared && sameAddress(this.ats[common + 1], chain[common + 1].pose.at)) common++
        let pose = new Pose(this.position.clone(), undefined, 1, this.ats[deepest])
        for(let depth = deepest; depth > common; depth--) pose = this.levels[depth].leave(pose, time)
        for(let depth = common + 1; depth <= current; depth++){
            pose = chain[depth].level.enter(pose, chain[depth].pose.at, time)
        }
        return pose.position
    }
}

function sameAddress(a: Address, b: Address): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i])
}

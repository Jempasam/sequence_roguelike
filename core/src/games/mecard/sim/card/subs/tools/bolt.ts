import type { Rgba } from "../../../base/Rgba"
import type { Vector2 } from "../../../base/Vector2"
import type { ActionRun } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ticks } from "./playing"
import { polygon } from "./previews"
import { still } from "../../../battle/effects"
import { TICKS_PER_SECOND } from "../../../battle/rules"

/** How wide a bolt is, in meters: a thin line, which touches the body it stops on. */
export const BOLT_WIDTH = 0.1

/** How fast a bolt flies, in meters per second. */
const BOLT_SPEED = 16

/** A bolt flying from a point to another, at its speed: a spell, a harpoon. */
export function* fly(battle: Battle, from: Vector2, to: Vector2, color: Rgba): ActionRun {
    const count = ticks(from.distance(to) / BOLT_SPEED)
    for(let tick = 1; tick <= count; tick++){
        const head = from.plus(to.minus(from).times(tick / count))
        const tail = from.plus(to.minus(from).times(Math.max(0, tick - 2) / count))
        const shown = [polygon({ kind: "segment", from: tail, to: head, width: BOLT_WIDTH * 2 }, color)]
        battle.post(still(1 / TICKS_PER_SECOND, shown))
        yield
    }
}

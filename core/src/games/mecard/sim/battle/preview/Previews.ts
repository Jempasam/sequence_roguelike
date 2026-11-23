import type { Rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { Pose } from "../Action"
import type { Area } from "../Area"
import type { Unit } from "../Unit"
import { BODY_COLOR, HIT_COLOR, MARK_COLOR, MISS_COLOR, MOVE_COLOR, POTENTIAL_COLOR } from "../previewColors"

import type { Indicator, Preview } from "./Preview"

/*
 * What a preview is made of: the helpers building the indicators and the previews that cards, statuses,
 * processes, usables and items show. Import it whole: `import * as Previews from "…/battle/preview/Previews"`.
 */

/** A preview leaving the unit as it was. */
export function still(pose: Pose, ...indicators: Indicator[]): Preview {
    return { indicators, pose }
}

/** The previews of actions one after the other, each from where the one before leaves the unit. */
export function chained(previews: readonly Preview[], start: Pose): Preview {
    return {
        indicators: previews.flatMap(preview => preview.indicators),
        pose: previews.length > 0 ? previews[previews.length - 1].pose : start,
    }
}

/** A text over a point, in the arena. */
export function label(at: Vector2, text: string, color: Rgba): Indicator {
    return { kind: "label", at, text, color }
}

/** A line with a head at its last point. */
export function arrow(points: readonly Vector2[], width: number, color: Rgba): Indicator {
    return { kind: "arrow", points, width, color }
}

/** The outline of an area, filled. */
export function polygon(area: Area, color: Rgba): Indicator {
    return { kind: "polygon", points: area, color }
}

/** A blue disc the size of the body of a unit, where it ends up. */
export function body(unit: Unit, at: Vector2, direction: Vector2 = unit.direction): Indicator {
    return polygon(unit.hitbox.outline({ position: at, direction }), BODY_COLOR)
}

/**
 * The preview of a move: a grey arrow to where it would go with nothing in the way, the blue arrow of where it
 * goes over it, and a blue disc the size of the body where the unit ends up.
 */
export function moving(unit: Unit, from: Vector2, potential: Vector2, landing: Vector2, width: number): Indicator[] {
    return [
        arrow([from, potential], width, POTENTIAL_COLOR),
        arrow([from, landing], width, MOVE_COLOR),
        body(unit, landing),
    ]
}

/**
 * The preview of an attack: its areas in red when it would reach someone, in pastel blue when nobody, and
 * a red disc over each unit it would reach, each once.
 */
export function strike(areas: readonly Area[], touched: readonly Unit[]): Indicator[] {
    const color = touched.length > 0 ? HIT_COLOR : MISS_COLOR
    const marks = [...new Set(touched)].map(hit => {
        return polygon(hit.hitbox.outline(hit), MARK_COLOR)
    })
    return [...areas.map(area => polygon(area, color)), ...marks]
}

import type { Rgba } from "../../../base/Rgba"
import type { Vector2 } from "../../../base/Vector2"
import { outline } from "../../../battle/Area"
import type { Indicator, Pose, Preview } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"
import { HIT_COLOR, MARK_COLOR, MISS_COLOR } from "../../../battle/previewColors"

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
    return { kind: "polygon", points: outline(area), color }
}

/**
 * The preview of an attack: its areas in red when it would reach someone, in pastel blue when nobody, and
 * a red disc over each unit it would reach, each once.
 */
export function strike(areas: readonly Area[], touched: readonly Unit[]): Indicator[] {
    const color = touched.length > 0 ? HIT_COLOR : MISS_COLOR
    const marks = [...new Set(touched)].map(hit => {
        return polygon({ kind: "circle", center: hit.position, radius: hit.radius }, MARK_COLOR)
    })
    return [...areas.map(area => polygon(area, color)), ...marks]
}

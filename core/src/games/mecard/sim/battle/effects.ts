import type { Rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"

import type { Indicator } from "./Action"
import { outline } from "./Area"
import type { Area } from "./Area"
import type { Effect } from "./signals"

/** How many times a second an effect changing over its life is computed, when it is posted. */
const SAMPLES_PER_SECOND = 30

/** An effect showing the same all along its life. */
export function still(seconds: number, indicators: readonly Indicator[]): Effect {
    return { duration: seconds, frame: () => indicators }
}

/** An effect showing the same, fading out over its life: a number, a flash. */
export function fading(seconds: number, indicators: readonly Indicator[]): Effect {
    return {
        duration: seconds,
        frame: share => indicators.map(indicator => faded(indicator, 1 - share)),
    }
}

/**
 * An effect changing over its life: what it shows at each moment, computed at once, when it is posted, so
 * it never reads a battle gone on since.
 *
 * @param at - What it shows once a share of its life went by, from 0 to 1.
 */
export function sampled(seconds: number, at: (share: number) => readonly Indicator[]): Effect {
    const count = Math.max(1, Math.round(seconds * SAMPLES_PER_SECOND))
    const frames = Array.from({ length: count + 1 }, (_, index) => at(index / count))
    return {
        duration: seconds,
        frame: share => frames[Math.min(count, Math.max(0, Math.round(share * count)))],
    }
}

/** An area shown filled for a while. */
export function polygonEffect(area: Area, color: Rgba, seconds: number): Effect {
    return still(seconds, [polygonOf(area, color)])
}

/** A straight line from a point to another, shown for a while. */
export function lineEffect(from: Vector2, to: Vector2, width: number, color: Rgba, seconds: number): Effect {
    return still(seconds, [polygonOf({ kind: "segment", from, to, width }, color)])
}

/** A word over a point, fading out. */
export function labelEffect(at: Vector2, text: string, color: Rgba, seconds: number): Effect {
    return fading(seconds, [{ kind: "label", at, text, color }])
}

/** The outline of an area, filled. */
export function polygonOf(area: Area, color: Rgba): Indicator {
    return { kind: "polygon", points: outline(area), color }
}

/** An indicator, its opacity scaled. */
function faded(indicator: Indicator, opacity: number): Indicator {
    return { ...indicator, color: { ...indicator.color, a: indicator.color.a * opacity } }
}

import type { Painter } from "../../gpu"
import type { Color } from "../../math"

/** The colors of a dial. */
export interface DialLook {
    /** The disc. */
    readonly face: Color

    /** The dot at its center. */
    readonly dot: Color

    /** The needle from the center to the edge. */
    readonly needle: Color
}

/** How much of the radius around the center counts as the center: a click there points nowhere. */
const DEAD_ZONE = 0.15

/** The thickness of the needle, as a share of the radius, at least one pixel. */
const NEEDLE_SHARE = 0.14

/** The size of the dot at the center, as a share of the radius. */
const DOT_SHARE = 0.18

/**
 * A disc with a needle pointing at one of a number of directions, evenly spread: the first straight up, the
 * others clockwise. It knows how to draw itself and which direction a point of it stands for, and nothing of
 * where it is: the component that holds it places it, hands it the clicks, and keeps the direction chosen.
 */
export class Dial {


    /**
     * @throws {@link Error} When it has fewer than two directions.
     */
    constructor(
        /** How many directions it points at. */
        public readonly steps: number,

        public readonly look: DialLook,
    ){
        if(!Number.isInteger(steps) || steps < 2) throw new Error(`A dial points at 2 directions or more, not ${steps}.`)
    }


    /** Is a point on the disc, its center included? Same arguments as {@link Dial.stepAt}. */
    public contains(dx: number, dy: number, radius: number): boolean {
        return Math.hypot(dx, dy) <= radius
    }

    /**
     * The direction a point stands for, seen from the center of the dial.
     *
     * @param dx - How far right of the center the point is.
     * @param dy - How far under the center it is, the screen growing downward.
     * @param radius - The radius of the dial: a point too close to the center stands for none.
     * @returns The step, none for a point at the center.
     */
    public stepAt(dx: number, dy: number, radius: number): number|null {
        if(Math.hypot(dx, dy) <= radius * DEAD_ZONE) return null
        // Clockwise from up.
        const turn = Math.atan2(dx, -dy) / (2 * Math.PI)
        const step = Math.round(turn * this.steps)
        return ((step % this.steps) + this.steps) % this.steps
    }

    /**
     * Draw the dial around a point, its needle toward a step.
     *
     * @param face - Another color for the disc than the one of its look, such as a lighter one under the pointer.
     */
    public draw(painter: Painter, cx: number, cy: number, radius: number, step: number, face?: Color): void {
        const { dot, needle } = this.look
        painter.setTint(face ?? this.look.face)
        painter.circle(cx, cy, radius)
        const angle = (step / this.steps) * 2 * Math.PI
        const tip = { x: cx + Math.sin(angle) * radius, y: cy - Math.cos(angle) * radius }
        painter.setTint(needle)
        painter.thickLine({ x: cx, y: cy }, tip, Math.max(1, radius * NEEDLE_SHARE))
        painter.setTint(dot)
        painter.circle(cx, cy, Math.max(1, radius * DOT_SHARE))
    }
}

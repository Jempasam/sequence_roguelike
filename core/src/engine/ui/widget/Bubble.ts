import type { Painter } from "../../gpu"
import { Color } from "../../math"

import { internals } from "../Component"
import { ContentContainer } from "../Container"
import { Rect } from "../Rect"
import { EMPTY_HINT, paddedHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How a bubble is set up beyond its theme. */
export interface BubbleOptions {
    /** The color inside it, white by default. */
    readonly fill?: Color

    /** The color of its edge, black by default. */
    readonly edge?: Color

    /** How thick its edge is, in virtual pixels, 1 by default. */
    readonly edgeWidth?: number

    /** The radius of its corners, in virtual pixels, 4 by default. */
    readonly radius?: number

    /** The space between its edge and its content, in virtual pixels, the one of the panels by default. */
    readonly padding?: number

    /** How far its point goes out of its edge at most, in virtual pixels, 6 by default. */
    readonly pointLength?: number

    /** How wide its point is where it leaves the edge, in virtual pixels, 8 by default. */
    readonly pointWidth?: number

    /** Does it stop the pointer over its bounds, so a click on it never reaches the world? Yes by default. */
    readonly interactive?: boolean
}

/** A point, in virtual pixels. */
export interface BubbleTarget {
    readonly x: number
    readonly y: number
}

/**
 * A speech bubble around one child: a face with round corners and an edge, and a point, a V, leaving the
 * edge toward a point of the interface, who speaks. The point may be hidden.
 *
 * @remarks
 * The point leaves the edge where it lies nearest the point aimed at, kept off the round corners, and its
 * tip goes straight toward it, so it follows a speaker anywhere around the bubble. The bubble keeps room
 * around its face for its point on every side, whether it shows it or not, so pointing elsewhere never lays
 * anything out again. The point hides while the point aimed at lies inside the face.
 */
export class Bubble extends ContentContainer {


    constructor(
        /** The look of the bubble: its white pixel and padding. */
        public readonly theme: Theme,

        options: BubbleOptions = {},
    ){
        super()
        this.#fill = (options.fill ?? new Color(1, 1, 1)).clone()
        this.#edge = (options.edge ?? new Color(0, 0, 0)).clone()
        this.#edgeWidth = options.edgeWidth ?? 1
        this.#radius = options.radius ?? 4
        this.#padding = options.padding ?? theme.panel.padding
        this.#pointLength = options.pointLength ?? 6
        this.#pointWidth = options.pointWidth ?? 8
        this.#interactive = options.interactive ?? true
    }


    /** The point its V aims at, in virtual pixels of the interface, none while the V is hidden. */
    public get target(): BubbleTarget|null { return this.#target }

    /**
     * Aim its V at a point, in virtual pixels of the interface, as the pointer is given. Aiming at the same
     * point does nothing.
     */
    public pointAt(x: number, y: number): void {
        const target = this.#target
        if(target && target.x === x && target.y === y) return
        this.#target = { x, y }
        this.invalidate()
    }

    /** Hide its V. */
    public hidePoint(): void {
        if(!this.#target) return
        this.#target = null
        this.invalidate()
    }


    protected override get interactive(): boolean {
        return this.#interactive
    }

    protected computeHint(maxWidth: number): SizeHint {
        const around = 2 * (this.#room + this.#edgeWidth + this.#padding)
        const content = this.content
        const hint = content?.visible ? content.measure(maxWidth - around) : EMPTY_HINT
        return paddedHint(hint, around, around)
    }

    protected override arranged(): void {
        const content = this.content
        if(!content?.visible) return
        const inset = this.#room + this.#edgeWidth + this.#padding
        const { width, height } = this.bounds
        this.#rect.set(inset, inset, Math.max(0, width - 2 * inset), Math.max(0, height - 2 * inset))
        this.place(content, this.#rect)
    }

    protected paint(painter: Painter): void {
        const face = this.#face()
        if(face.isEmpty) return
        const edge = this.#edgeWidth
        const point = this.#point(face)
        painter.push()
        painter.setWhitePixel(this.theme.white)
        painter.setTint(this.#edge)
        roundRect(painter, face.x, face.y, face.width, face.height, this.#radius)
        if(point) this.#drawPoint(painter, point, edge, 2 * edge)
        painter.setTint(this.#fill)
        roundRect(painter, face.x + edge, face.y + edge, face.width - 2 * edge, face.height - 2 * edge,
            Math.max(0, this.#radius - edge))
        if(point) this.#drawPoint(painter, point, 2 * edge, 0)
        painter.pop()
    }


    readonly #fill: Color
    readonly #edge: Color
    readonly #edgeWidth: number
    readonly #radius: number
    readonly #padding: number
    readonly #pointLength: number
    readonly #pointWidth: number
    readonly #interactive: boolean
    #target: BubbleTarget|null = null
    readonly #rect = new Rect()
    readonly #faceRect = new Rect()
    readonly #local = { x: 0, y: 0 }

    /** The room kept around the face for the point and its edge, in virtual pixels. */
    get #room(): number {
        return this.#pointLength + 2 * this.#edgeWidth
    }

    /** The face, its edge included, in its own coordinates. */
    #face(): Rect {
        const room = this.#room
        const { width, height } = this.bounds
        return this.#faceRect.set(room, room, Math.max(0, width - 2 * room), Math.max(0, height - 2 * room))
    }

    /**
     * Where the point leaves the face and where it ends: the middle of its base on the edge nearest the
     * point aimed at, the outward normal of that edge, the edge along it, and its tip, toward the point
     * aimed at. None when it is hidden, or the point aimed at lies inside the face.
     */
    #point(face: Readonly<Rect>): BubblePoint|null {
        const target = this.#target
        const local = this.#local
        if(!target || !internals.localPoint(this, target.x, target.y, local)) return null
        const { x, y } = local
        // How far the point aimed at lies beyond each pair of edges, none while it lies between them.
        const beyondX = x < face.x ? face.x - x : x > face.right ? x - face.right : 0
        const beyondY = y < face.y ? face.y - y : y > face.bottom ? y - face.bottom : 0
        if(beyondX === 0 && beyondY === 0) return null
        const onSide = beyondX >= beyondY
        const keep = this.#radius + this.#pointWidth / 2
        let baseX: number
        let baseY: number
        if(onSide){
            baseX = x < face.x ? face.x : face.right
            baseY = clampOrMiddle(y, face.y + keep, face.bottom - keep)
        } else {
            baseX = clampOrMiddle(x, face.x + keep, face.right - keep)
            baseY = y < face.y ? face.y : face.bottom
        }
        baseX = Math.round(baseX)
        baseY = Math.round(baseY)
        const normalX = onSide ? (x < face.x ? -1 : 1) : 0
        const normalY = onSide ? 0 : (y < face.y ? -1 : 1)
        const toX = x - baseX
        const toY = y - baseY
        const distance = Math.hypot(toX, toY)
        const length = Math.min(this.#pointLength, distance)
        return {
            baseX, baseY, normalX, normalY, alongX: onSide ? 0 : 1, alongY: onSide ? 1 : 0,
            tipX: Math.round(baseX + toX / distance * length),
            tipY: Math.round(baseY + toY / distance * length),
            halfWidth: this.#pointWidth / 2,
        }
    }

    /**
     * Fill the point as a triangle, its base sunk into the face, grown on every side by some pixels: by the
     * edge for the edge, by none for the fill.
     */
    #drawPoint(painter: Painter, point: BubblePoint, sunk: number, grown: number): void {
        const { baseX, baseY, normalX, normalY, alongX, alongY, tipX, tipY } = point
        const half = point.halfWidth + grown
        const x = baseX - normalX * sunk
        const y = baseY - normalY * sunk
        const outX = tipX - baseX
        const outY = tipY - baseY
        const out = Math.hypot(outX, outY)
        const grow = out > 0 ? 1.5 * grown / out : 0
        painter.triangle(
            x - alongX * half, y - alongY * half,
            x + alongX * half, y + alongY * half,
            tipX + outX * grow, tipY + outY * grow,
        )
    }
}

/** Where the point of a bubble lies, in its own coordinates. */
interface BubblePoint {
    readonly baseX: number
    readonly baseY: number
    readonly normalX: number
    readonly normalY: number
    readonly alongX: number
    readonly alongY: number
    readonly tipX: number
    readonly tipY: number
    readonly halfWidth: number
}

/** A value kept between two bounds, or their middle when they cross. */
function clampOrMiddle(value: number, min: number, max: number): number {
    if(min > max) return (min + max) / 2
    return Math.max(min, Math.min(max, value))
}

/** Fill a rectangle with round corners, the radius shrunk to fit. */
function roundRect(
    painter: Painter, x: number, y: number, width: number, height: number, radius: number,
): void {
    if(width <= 0 || height <= 0) return
    const r = Math.min(radius, Math.floor(width / 2), Math.floor(height / 2))
    if(r <= 0){
        painter.rect(x, y, width, height)
        return
    }
    painter.rect(x + r, y, width - 2 * r, height)
    painter.rect(x, y + r, r, height - 2 * r)
    painter.rect(x + width - r, y + r, r, height - 2 * r)
    painter.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI)
    painter.arc(x + width - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI)
    painter.arc(x + width - r, y + height - r, r, 0, 0.5 * Math.PI)
    painter.arc(x + r, y + height - r, r, 0.5 * Math.PI, Math.PI)
}

import type { PnjLayout } from "./PnjLayout"

/** How far the body leans at a lean of 1, and the head turns at a direction of 1, in radians. */
const QUARTER_TURN = Math.PI / 2

/** How high above the bending line the body curves, before its top goes on straight, in its height. */
const BEND_SHARE = 0.2

/** Where the neck turns the head, from the top of the head, in its height. */
const NECK_SHARE = 0.85

/** How much lower the body stands at a squash of 1, in its height, and how much wider, in its width. */
const MAX_SQUASH = 0.5
const SQUASH_WIDEN = 0.35

/**
 * The narrowest the character gets when seen from the side, in its width: turning squashes it on `x` down
 * to this, never to nothing, and it flips from one side to the other at this width.
 */
const MIN_WIDTH = 0.35

/**
 * How far sideways from the eyes a point looked at makes the character face it whole, in pixels of its
 * painting. Closer, it is seen more from the side, so crossing in front of it turns it smoothly.
 */
const TURN_RANGE = 110

/** The direction the head takes alone when looking at a point, beyond which the body leans to help it. */
const HEAD_FREE = 0.35

/**
 * How far the head turns alone, in orientation, to face a point looked at, beyond which the body turns to
 * face it too. The body looking at a point is never seen narrower than `1 - HEAD_TURN_FREE` of its side.
 */
const HEAD_TURN_FREE = 0.5

/** Below this lean, in radians, the body is straight: its curve would have an infinite radius. */
const STRAIGHT = 1e-6

/**
 * What a character looking at a point does: the side its body faces, how its head turns from it, where its
 * head looks, how it leans.
 */
export interface Gaze {
    readonly orientation: number
    readonly headTurn: number
    readonly head: number
    readonly lean: number
}

/**
 * Where a hat sits, in the coordinates of the character: its point at the middle of the bottom edge of the
 * place of the hat, and how that place is turned. A hat is drawn there by translating to `x, y`, scaling
 * by `scaleX` on `x` only, turning by `angle`, then drawing it bottom-centered, about `width` wide.
 */
export interface HatPlace {
    readonly x: number
    readonly y: number

    /** How the head is turned, in radians, clockwise since `y` is down. */
    readonly angle: number

    /**
     * How the head is scaled on `x` by its orientation: its side by the sign, how much it is seen from the
     * side by the size, from {@link MIN_WIDTH} to 1.
     */
    readonly scaleX: number

    /** The size of the place, in pixels of the painting. A hat barely covers it. */
    readonly width: number
    readonly height: number
}

/**
 * The pose of a character painted flat, as a cut-out puppet: the side it faces, the direction of its head,
 * how it leans and how squashed it is, and where any point of its painting lands then.
 *
 * @remarks
 * Its coordinates are pixels of the painting, `y` down, its origin between its feet: the middle of the
 * bottom edge of the canvas. The painting faces the viewer, its gaze to the right.
 *
 * A point of the body is bent first, then squashed, then turned: the body curves over a band above its
 * bending line, the middle of the body, and goes on straight above it; the squash lowers it toward its
 * feet and widens it; the orientation scales it on `x` around its middle, down to a narrowest width,
 * flipping it when negative. The head is not deformed: it follows the neck, turned by the lean of the body
 * and its own direction, then scaled on `x` by its own orientation, that of the body plus its turn, down
 * to the same narrowest width. The head always faces the side of the body, so both flip at once and the
 * neck never looks broken.
 *
 * Every setter takes a value in its range and throws outside it, so a pose built by adding effects keeps
 * them in range itself and nothing is cut silently.
 */
export class PnjPose {


    constructor(
        /** Where its parts lie on its painting. */
        public readonly layout: PnjLayout,
    ){
        this.#bendLine = layout.body.y + layout.body.height / 2
        this.#bendBand = layout.body.height * BEND_SHARE
        this.#neckX = layout.head.x + layout.head.width / 2
        this.#neckY = layout.head.y + layout.head.height * NECK_SHARE
        this.#hat = this.#placeHat()
    }


    //// Pose ////

    /**
     * The side it faces and how much it is seen from the side, from -1, facing left, to 1, facing right as
     * painted. Toward 0 it is seen more from the side, narrower down to {@link MIN_WIDTH} of its width,
     * and it flips side when the orientation crosses 0.
     */
    public get orientation(): number { return this.#orientation }

    public set orientation(orientation: number){
        this.#orientation = inRange(orientation, -1, 1, "orientation")
        this.#moved()
    }

    /**
     * How its head turns around its vertical axis, from -1 to 1, added to the orientation of the body: the
     * head faces `orientation + headTurn`, kept on the side the body faces, from its narrowest to whole.
     * Turned past its narrowest, it stays there, and flips side only with the body.
     */
    public get headTurn(): number { return this.#headTurn }

    public set headTurn(headTurn: number){
        this.#headTurn = inRange(headTurn, -1, 1, "head turn")
        this.#moved()
    }

    /**
     * Where the head faces, from -1 to 1 as the orientation: that of the body plus the head turn, kept on
     * the side of the body. It is 0 at its narrowest, on that side.
     */
    public get headOrientation(): number {
        const side = sideOf(this.#orientation)
        return side * Math.min(1, Math.max(0, side * (this.#orientation + this.#headTurn)))
    }

    /** Where its head looks, from -1, straight down, through 0, ahead, to 1, straight up. */
    public get head(): number { return this.#head }

    public set head(head: number){
        this.#head = inRange(head, -1, 1, "head direction")
        this.#moved()
    }

    /**
     * How its body leans, from -1, forward at a quarter turn, through 0, straight, to 1, backward at a
     * quarter turn. The body curves over its middle, as a sheet of paper bent.
     */
    public get lean(): number { return this.#lean }

    public set lean(lean: number){
        this.#lean = inRange(lean, -1, 1, "lean")
        this.#moved()
    }

    /** How squashed its body is, from 0, not at all, to 1, at its lowest and widest. */
    public get squash(): number { return this.#squash }

    public set squash(squash: number){
        this.#squash = inRange(squash, 0, 1, "squash")
        this.#moved()
    }


    //// Gaze ////

    /**
     * What it does to look at a point. Sideways, the body faces the side of the point, whole while the head
     * alone turns toward the point by up to {@link HEAD_TURN_FREE}, then turning with it, so it is never
     * left narrow. The head and the body flip side together, when the point crosses in front of the eyes.
     * Up and down, the head looks first, and the body leans when the head alone would turn further than
     * {@link HEAD_FREE}. The head looks exactly at the point from where the eyes stand straight.
     *
     * @param x - The point, in the coordinates of the character.
     */
    public gazeAt(x: number, y: number): Gaze {
        const { head } = this.layout
        const toX = x - (head.x + head.width / 2 - this.layout.width / 2)
        const toY = y - (head.y + head.height / 2 - this.layout.height)
        const facing = Math.max(-1, Math.min(1, toX / TURN_RANGE))
        const orientation = sideOf(facing) * Math.min(1, Math.abs(facing) + HEAD_TURN_FREE)
        const direction = Math.atan2(-toY, Math.abs(toX)) / QUARTER_TURN
        const headAlone = Math.max(-HEAD_FREE, Math.min(HEAD_FREE, direction))
        return { orientation, headTurn: facing - orientation, head: headAlone, lean: direction - headAlone }
    }

    /** Look at a point at once, in the coordinates of the character. */
    public lookAt(x: number, y: number): void {
        this.setGaze(this.gazeAt(x, y))
    }

    /** Take a gaze at once: its orientation, its head turn, its head direction and its lean. */
    public setGaze(gaze: Gaze): void {
        this.#orientation = inRange(gaze.orientation, -1, 1, "orientation")
        this.#headTurn = inRange(gaze.headTurn, -1, 1, "head turn")
        this.#head = inRange(gaze.head, -1, 1, "head direction")
        this.#lean = inRange(gaze.lean, -1, 1, "lean")
        this.#moved()
    }


    //// Hat ////

    /** Where a hat sits now. */
    public get hat(): Readonly<HatPlace> { return this.#hat }

    /**
     * Hear each move of the place of the hat, after the pose changed. A change of pose leaving it where
     * it was is not told.
     *
     * @returns The handle that stops hearing it.
     */
    public onHatMove(listener: (hat: Readonly<HatPlace>) => void): { dispose(): void } {
        const own = { listener }
        this.#hatListeners.add(own)
        return { dispose: () => this.#hatListeners.delete(own) }
    }


    //// Shape ////

    /**
     * Write where a point of the body lands, bent, squashed and turned.
     *
     * @param x - The point, in pixels of the canvas of the painting.
     * @param out - Where the point is written, in the coordinates of the character.
     */
    public bodyPointInto(x: number, y: number, out: { x: number, y: number }): void {
        const { width, height } = this.layout
        const across = x - width / 2
        const above = this.#bendLine - y
        let pointX = across
        let pointY = y - height
        if(above > 0){
            const tilt = this.#tilt
            const band = this.#bendBand
            const curved = Math.min(above, band)
            const angle = tilt * curved / band
            // The spine curves as an arc of a circle over the band, then goes on straight at the full tilt.
            const isStraight = Math.abs(tilt) < STRAIGHT
            const radius = isStraight ? 0 : band / tilt
            let ahead = isStraight ? 0 : radius * (1 - Math.cos(angle))
            let up = isStraight ? curved : radius * Math.sin(angle)
            ahead += (above - curved) * Math.sin(angle)
            up += (above - curved) * Math.cos(angle)
            pointX = ahead + across * Math.cos(angle)
            pointY = this.#bendLine - up + across * Math.sin(angle) - height
        }
        const squash = this.#squash
        out.x = pointX * (1 + squash * SQUASH_WIDEN) * widthOf(this.#orientation, sideOf(this.#orientation))
        out.y = pointY * (1 - squash * MAX_SQUASH)
    }

    /**
     * Write where a point of the head lands, following the neck, turned by the lean and its direction,
     * scaled on `x` by its own orientation around the neck.
     *
     * @param x - The point, in pixels of the canvas of the painting.
     * @param out - Where the point is written, in the coordinates of the character.
     */
    public headPointInto(x: number, y: number, out: { x: number, y: number }): void {
        const angle = this.#headAngle
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const fromX = x - this.#neckX
        const fromY = y - this.#neckY
        this.bodyPointInto(this.#neckX, this.#neckY, out)
        out.x += (fromX * cos - fromY * sin) * widthOf(this.headOrientation, sideOf(this.#orientation))
        out.y += fromX * sin + fromY * cos
    }


    #orientation = 1
    #headTurn = 0
    #head = 0
    #lean = 0
    #squash = 0

    /** The height of the line the body bends at, and of the band it curves over, in pixels of the canvas. */
    readonly #bendLine: number
    readonly #bendBand: number

    /** The point the head turns around, in pixels of the canvas. */
    readonly #neckX: number
    readonly #neckY: number

    #hat: Readonly<HatPlace>
    readonly #hatListeners = new Set<{ listener: (hat: Readonly<HatPlace>) => void }>()

    /** A point to compute in, so placing the hat allocates nothing but the place. */
    readonly #point = { x: 0, y: 0 }

    /** How far the top of the body is turned, in radians, clockwise: forward is toward the gaze. */
    get #tilt(): number {
        return -this.#lean * QUARTER_TURN
    }

    /** How far the head is turned, in radians, clockwise: the lean of the body plus its own direction. */
    get #headAngle(): number {
        return this.#tilt - this.#head * QUARTER_TURN
    }

    /** Place the hat again after a change of pose, and tell it when it moved. */
    #moved(): void {
        const hat = this.#placeHat()
        const old = this.#hat
        const isMoved = hat.x !== old.x || hat.y !== old.y
        const isTurned = hat.angle !== old.angle || hat.scaleX !== old.scaleX
        if(!isMoved && !isTurned) return
        this.#hat = hat
        for(const { listener } of [...this.#hatListeners]) listener(hat)
    }

    #placeHat(): Readonly<HatPlace> {
        const { x, y, width, height } = this.layout.hatPlace
        const point = this.#point
        this.headPointInto(x + width / 2, y + height, point)
        const scaleX = widthOf(this.headOrientation, sideOf(this.#orientation))
        return { x: point.x, y: point.y, angle: this.#headAngle, scaleX, width, height }
    }
}

/** The side an orientation faces: -1 for the left, 1 for the right, which 0 faces as painted. */
function sideOf(orientation: number): -1|1 {
    return orientation < 0 ? -1 : 1
}

/**
 * How an orientation scales on `x`: never narrower than {@link MIN_WIDTH}, flipped on the left. The side
 * is given, since a head at its narrowest, 0, faces the side of its body.
 */
function widthOf(orientation: number, side: -1|1): number {
    return side * (MIN_WIDTH + (1 - MIN_WIDTH) * Math.abs(orientation))
}

/**
 * A value of a pose, checked to be in its range.
 *
 * @throws {@link RangeError} When it is outside, or not a number.
 */
function inRange(value: number, low: number, high: number, name: string): number {
    if(!(value >= low && value <= high)){
        throw new RangeError(`The ${name} of a character goes from ${low} to ${high}, not ${value}.`)
    }
    return value
}

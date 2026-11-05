import { ContentContainer } from "../Container"
import type { Pose } from "../Pose"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** How far a tilt may turn and how much larger it may draw: the room it keeps around its content. */
export interface TiltLimits {
    /** The farthest it turns either way, in radians. */
    readonly angle: number

    /** The largest it draws its content: 1 for its size. */
    readonly scale: number
}

/**
 * A content drawn turned and scaled about its center: a card leaning, a card growing under the pointer.
 * Its content is placed in its middle, with room around it for the farthest turn and the largest scale
 * its limits allow, so what it draws stays within its bounds.
 *
 * @remarks
 * The pointer hits the content where it is drawn: a point is turned back before it is looked for. Under a
 * tilt, nothing is cut: a scroll in it is refused.
 */
export class Tilt extends ContentContainer {


    constructor(
        /** How far it may turn and how much larger it may draw. */
        public readonly limits: TiltLimits,
    ){
        super()
    }


    /** How far it turns its content, in radians, clockwise. */
    public get angle(): number { return this.#angle }

    /** @throws {@link Error} Beyond its limits, since it would draw out of its bounds. */
    public set angle(angle: number){
        if(angle === this.#angle) return
        if(Math.abs(angle) > this.limits.angle){
            throw new Error(`A tilt limited to ${this.limits.angle} rad was turned by ${angle} rad.`)
        }
        this.#angle = angle
        this.invalidate()
    }

    /** How much larger it draws its content: 1 for its size. */
    public get scale(): number { return this.#scale }

    /** @throws {@link Error} Beyond its limits, or not positive, since it would draw out of its bounds. */
    public set scale(scale: number){
        if(scale === this.#scale) return
        if(scale <= 0 || scale > this.limits.scale){
            throw new Error(`A tilt limited to ×${this.limits.scale} was scaled ×${scale}.`)
        }
        this.#scale = scale
        this.invalidate()
    }


    protected computeHint(maxWidth: number): SizeHint {
        const content = this.content
        if(!content || !content.visible) return sizeHint(0, 0)
        const hint = content.measure(maxWidth)
        const [roomX, roomY] = this.#roomAround(hint.preferredWidth, hint.preferredHeight)
        return sizeHint(
            hint.minWidth + 2 * roomX, hint.minHeight + 2 * roomY,
            hint.preferredWidth + 2 * roomX, hint.preferredHeight + 2 * roomY,
        )
    }

    /** Draws nothing of its own: its content draws, posed. */
    protected paint(): void {}

    protected override arranged(): void {
        const content = this.content
        if(!content || !content.visible) return
        const { width, height } = this.bounds
        const hint = content.measure(width)
        const [roomX, roomY] = this.#roomAround(hint.preferredWidth, hint.preferredHeight)
        const childWidth = Math.max(0, width - 2 * roomX)
        const childHeight = Math.max(0, height - 2 * roomY)
        this.place(content, this.#rect.set(roomX, roomY, childWidth, childHeight))
    }

    protected override pose(): Pose|null {
        if(this.#angle === 0 && this.#scale === 1) return null
        const pose = this.#pose
        pose.x = this.bounds.width / 2
        pose.y = this.bounds.height / 2
        pose.angle = this.#angle
        pose.scale = this.#scale
        return pose
    }


    #angle = 0
    #scale = 1
    readonly #rect = new Rect()

    /** The pose given while it turns or scales, rewritten each time, so drawing allocates nothing. */
    readonly #pose = { x: 0, y: 0, angle: 0, scale: 1 }

    /**
     * The room kept on each side of a content of a size, in whole pixels: half of what it grows by, turned
     * as far and drawn as large as the limits allow.
     */
    #roomAround(width: number, height: number): [number, number] {
        const { angle, scale } = this.limits
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const turnedWidth = scale * (width * cos + height * sin)
        const turnedHeight = scale * (width * sin + height * cos)
        return [Math.ceil((turnedWidth - width) / 2), Math.ceil((turnedHeight - height) / 2)]
    }
}

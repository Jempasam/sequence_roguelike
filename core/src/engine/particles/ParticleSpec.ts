import { Color } from "../math"
import type { Sprite } from "../gpu"

/**
 * The description of one particle, filled by the caller and given to {@link ParticleSystem.emit}.
 *
 * @remarks
 * One spec is meant to be reused for every particle: the system copies it, so filling the same object
 * again allocates nothing. The emitters hand over their own, already reset, to the `fill` function.
 */
export class ParticleSpec {

    /** The horizontal position at the start, in pixels. */
    public x = 0

    /** The vertical position at the start, in pixels. */
    public y = 0

    /** The horizontal speed at the start, in pixels per second. */
    public vx = 0

    /** The vertical speed at the start, in pixels per second. */
    public vy = 0

    /** The constant horizontal acceleration, in pixels per second squared: a wind. */
    public ax = 0

    /** The constant vertical acceleration, in pixels per second squared: a gravity. */
    public ay = 0

    /** The share of the speed lost each second, 0 for none: the speed is multiplied by `exp(-drag * dt)`. */
    public drag = 0

    /** The time the particle lives, in seconds. */
    public life = 1

    /** The size at the start. A square side, or the width of the sprite, which keeps its ratio. */
    public sizeStart = 1

    /** The size at the end of the life. */
    public sizeEnd = 1

    /** The color at the start, alpha included. */
    public readonly colorStart = new Color()

    /** The color at the end of the life, alpha included. */
    public readonly colorEnd = new Color()

    /**
     * The sprite drawn, or none for a colored square. A sprite is tinted by the color, centered on the
     * position, and its origin is ignored.
     */
    public sprite: Sprite|null = null

    /** Is the sprite drawn mirrored, its left on the right? */
    public mirrored = false

    /** Does the particle turn toward its speed? The rotation and the spin are then ignored. */
    public faceMotion = false

    /** The angle at the start, in radians. */
    public rotation = 0

    /** The turn each second, in radians. */
    public spin = 0


    /** Give back every field its neutral value, so a spec is filled from a known state. */
    public reset(): this {
        this.x = 0
        this.y = 0
        this.vx = 0
        this.vy = 0
        this.ax = 0
        this.ay = 0
        this.drag = 0
        this.life = 1
        this.sizeStart = 1
        this.sizeEnd = 1
        this.colorStart.set(1, 1, 1, 1)
        this.colorEnd.set(1, 1, 1, 1)
        this.sprite = null
        this.mirrored = false
        this.faceMotion = false
        this.rotation = 0
        this.spin = 0
        return this
    }
}

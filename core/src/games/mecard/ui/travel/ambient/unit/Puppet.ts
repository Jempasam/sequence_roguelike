import type { Sprite } from "../../../../../../engine/gpu"
import type { Point } from "../../../../../../engine/math"
import type { ParticleSystem } from "../../../../../../engine/particles"

/** What a puppet looks like. */
export interface PuppetLook {
    readonly system: ParticleSystem

    /** Its picture, null for a square. */
    readonly sprite: Sprite|null

    /** The side of the square, or the width of the picture, in pixels. */
    readonly size: number

    /** The color as `0xRRGGBB`. */
    readonly color: number

    /** Its angle, in radians: upright by default. */
    readonly rotation?: number

    /** Is its picture mirrored? */
    readonly mirrored?: boolean
}

/** A single particle moved at will, frame after frame, such as a bird that waits on a head. */
export class Puppet {

    /** Where it was last shown. */
    public at: Point = { x: 0, y: 0 }

    constructor(
        public readonly look: PuppetLook,

        /** The most seconds it may be shown for. */
        public readonly life: number,
    ){}

    /**
     * Show it at a point with an opacity: it appears at its first call.
     *
     * @returns False when it cannot be shown: the system is full, or its time is over.
     */
    public place(at: Point, opacity: number, dt: number): boolean {
        this.at = { x: at.x, y: at.y }
        const { system } = this.look
        if(this.#handle !== null) return system.steer(this.#handle, at.x, at.y, dt, opacity)
        const { sprite, size, color } = this.look
        const spec = system.scratch.reset()
        spec.x = at.x
        spec.y = at.y
        spec.sizeStart = size
        spec.sizeEnd = size
        spec.life = this.life + 1
        spec.sprite = sprite
        spec.rotation = this.look.rotation ?? 0
        spec.mirrored = this.look.mirrored ?? false
        const [r, g, b] = [(color >> 16 & 255) / 255, (color >> 8 & 255) / 255, (color & 255) / 255]
        spec.colorStart.set(r, g, b, opacity)
        spec.colorEnd.set(r, g, b, opacity)
        this.#handle = system.emit(spec)
        return this.#handle !== 0
    }

    /** Stop showing it, where it is. */
    public hide(): void {
        if(this.#handle !== null) this.look.system.steer(this.#handle, this.at.x, this.at.y, 1, 0)
    }

    /** The handle of its particle, none before it appears. */
    #handle: number|null = null
}

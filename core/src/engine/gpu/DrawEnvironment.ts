/**
 * What applies to a draw with its current value, and never enters a `Model`: a model recorded yesterday
 * replays under the clip, the light and the colorization of now. It belongs to the painter, saved by
 * `push` and `pop`.
 *
 * @remarks
 * Adding an option means choosing its family first: is it replayed with its value of the recording, or
 * with the current one? The latter belongs here, the former in `DrawKey`. Here, it takes a field, its
 * default in `isDefault` and `copyFrom`, and its application by `Gpu`.
 *
 * Every change goes through a method, which moves {@link DrawEnvironment.revision}: the batch tells in one
 * comparison that the environment changed since its first draw. A change breaks the batch, so the light
 * and the colorization are states of a pass, not of a sprite: an effect that varies by sprite goes through
 * `aData`.
 */
export class DrawEnvironment {


    /** A number that changes whenever a value does. */
    public get revision(): number { return this.#revision }

    /** Is there a clip? Without one, the whole target is drawn on. */
    public get hasClip(): boolean { return this.#hasClip }

    /** The left edge of the clip, in pixels of the target. */
    public get clipX(): number { return this.#clipX }

    /** The bottom edge of the clip, in pixels of the target, counted from the bottom as `gl.scissor` does. */
    public get clipY(): number { return this.#clipY }

    public get clipWidth(): number { return this.#clipWidth }

    public get clipHeight(): number { return this.#clipHeight }

    /** The light multiplying every color, last: floats that may exceed 1 to brighten. */
    public get lightR(): number { return this.#lightR }

    public get lightG(): number { return this.#lightG }

    public get lightB(): number { return this.#lightB }

    /** The color the luminance is mixed towards by the colorization, just before the light. */
    public get colorizeR(): number { return this.#colorizeR }

    public get colorizeG(): number { return this.#colorizeG }

    public get colorizeB(): number { return this.#colorizeB }

    /** How much of the colorization is applied, from 0, none, to 1. */
    public get colorizeIntensity(): number { return this.#colorizeIntensity }

    /** The thickness of `LINES`, in pixels of the target. */
    public get lineWidth(): number { return this.#lineWidth }

    /** The size of `POINTS`, in pixels of the target. */
    public get pointSize(): number { return this.#pointSize }

    /** Is every value the one of a new environment, as a recording requires? */
    public get isDefault(): boolean {
        return !this.#hasClip && this.#lightR === 1 && this.#lightG === 1 && this.#lightB === 1
            && this.#colorizeIntensity === 0 && this.#lineWidth === 1 && this.#pointSize === 1
    }


    //// Changes ////

    /** Clip to a rectangle, in pixels of the target, from the bottom left corner. */
    public setClip(x: number, y: number, width: number, height: number): void {
        this.#hasClip = true
        this.#clipX = x
        this.#clipY = y
        this.#clipWidth = width
        this.#clipHeight = height
        this.#revision++
    }

    public setLight(r: number, g: number, b: number): void {
        this.#lightR = r
        this.#lightG = g
        this.#lightB = b
        this.#revision++
    }

    public setColorize(r: number, g: number, b: number, intensity: number): void {
        this.#colorizeR = r
        this.#colorizeG = g
        this.#colorizeB = b
        this.#colorizeIntensity = intensity
        this.#revision++
    }

    public setLineWidth(width: number): void {
        this.#lineWidth = width
        this.#revision++
    }

    public setPointSize(size: number): void {
        this.#pointSize = size
        this.#revision++
    }

    /** Take the values of another environment. */
    public copyFrom(other: DrawEnvironment): void {
        this.#hasClip = other.#hasClip
        this.#clipX = other.#clipX
        this.#clipY = other.#clipY
        this.#clipWidth = other.#clipWidth
        this.#clipHeight = other.#clipHeight
        this.#lightR = other.#lightR
        this.#lightG = other.#lightG
        this.#lightB = other.#lightB
        this.#colorizeR = other.#colorizeR
        this.#colorizeG = other.#colorizeG
        this.#colorizeB = other.#colorizeB
        this.#colorizeIntensity = other.#colorizeIntensity
        this.#lineWidth = other.#lineWidth
        this.#pointSize = other.#pointSize
        this.#revision++
    }


    #revision = 0
    #hasClip = false
    #clipX = 0
    #clipY = 0
    #clipWidth = 0
    #clipHeight = 0
    #lightR = 1
    #lightG = 1
    #lightB = 1
    #colorizeR = 1
    #colorizeG = 1
    #colorizeB = 1
    #colorizeIntensity = 0
    #lineWidth = 1
    #pointSize = 1
}

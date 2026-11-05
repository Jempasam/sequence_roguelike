/**
 * A color, as four floats from 0 to 1, alpha not premultiplied. The engine premultiplies it when it
 * writes it for the GPU. Its operations work in place, so a color kept in a field and reused every frame
 * allocates nothing.
 */
export class Color {


    /** Opaque white, by default. */
    constructor(
        public r = 1,
        public g = 1,
        public b = 1,
        public a = 1,
    ){}


    /** Give the color new components. */
    public set(r: number, g: number, b: number, a = 1): this {
        this.r = r
        this.g = g
        this.b = b
        this.a = a
        return this
    }

    /** Take the components of another color. */
    public copyFrom(other: Color): this {
        return this.set(other.r, other.g, other.b, other.a)
    }

    /** Multiply each component by the one of another color, as a tint does. */
    public multiply(other: Color): this {
        return this.set(this.r * other.r, this.g * other.g, this.b * other.b, this.a * other.a)
    }

    /** A new color with the same components. */
    public clone(): Color {
        return new Color(this.r, this.g, this.b, this.a)
    }

    /** Does the other color have exactly the same components? */
    public equals(other: Color): boolean {
        return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a
    }

    /** Is it opaque white, the color that changes nothing it multiplies? */
    public get isWhite(): boolean {
        return this.r === 1 && this.g === 1 && this.b === 1 && this.a === 1
    }
}

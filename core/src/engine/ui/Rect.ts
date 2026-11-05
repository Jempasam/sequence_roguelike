/**
 * A rectangle in virtual pixels, from its top left corner: the bounds of a component, a clip, a zone to
 * draw again.
 *
 * @remarks
 * Mutable, with operations in place, so the passes run every frame allocate nothing. A rectangle handed
 * out as `Readonly<Rect>` belongs to its owner and changes with it: a copy is kept with
 * {@link Rect.copyFrom}.
 */
export class Rect {


    constructor(
        public x = 0,
        public y = 0,
        public width = 0,
        public height = 0,
    ){}


    /** The right edge, outside the rectangle. */
    public get right(): number { return this.x + this.width }

    /** The bottom edge, outside the rectangle. */
    public get bottom(): number { return this.y + this.height }

    /** Does it cover no pixel? */
    public get isEmpty(): boolean { return this.width <= 0 || this.height <= 0 }

    /** How many pixels it covers. */
    public get area(): number { return this.isEmpty ? 0 : this.width * this.height }

    /** Are its corners on whole pixels? */
    public get isWhole(): boolean {
        return Number.isInteger(this.x) && Number.isInteger(this.y)
            && Number.isInteger(this.width) && Number.isInteger(this.height)
    }

    public set(x: number, y: number, width: number, height: number): this {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        return this
    }

    public copyFrom(other: Readonly<Rect>): this {
        return this.set(other.x, other.y, other.width, other.height)
    }

    public clone(): Rect {
        return new Rect(this.x, this.y, this.width, this.height)
    }

    public equals(other: Readonly<Rect>): boolean {
        return this.x === other.x && this.y === other.y
            && this.width === other.width && this.height === other.height
    }

    /** Move it by an offset. */
    public translate(dx: number, dy: number): this {
        this.x += dx
        this.y += dy
        return this
    }

    /** Does it hold a point? */
    public containsPoint(x: number, y: number): boolean {
        return x >= this.x && y >= this.y && x < this.right && y < this.bottom
    }

    /** Does it hold the whole of another rectangle? An empty one is held by any. */
    public contains(other: Readonly<Rect>): boolean {
        if(other.width <= 0 || other.height <= 0) return true
        return other.x >= this.x && other.y >= this.y
            && other.x + other.width <= this.right && other.y + other.height <= this.bottom
    }

    /** Do both share at least one pixel? */
    public intersects(other: Readonly<Rect>): boolean {
        return other.x < this.right && other.x + other.width > this.x
            && other.y < this.bottom && other.y + other.height > this.y
            && !this.isEmpty && other.width > 0 && other.height > 0
    }

    /** Do both share a pixel or an edge? */
    public touches(other: Readonly<Rect>): boolean {
        return other.x <= this.right && other.x + other.width >= this.x
            && other.y <= this.bottom && other.y + other.height >= this.y
    }

    /** Keep only the part it shares with another rectangle, empty when none. */
    public intersect(other: Readonly<Rect>): this {
        const left = Math.max(this.x, other.x)
        const top = Math.max(this.y, other.y)
        const right = Math.min(this.right, other.x + other.width)
        const bottom = Math.min(this.bottom, other.y + other.height)
        return this.set(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
    }

    /** Grow it to the smallest rectangle holding both. An empty one adds nothing. */
    public union(other: Readonly<Rect>): this {
        if(other.width <= 0 || other.height <= 0) return this
        if(this.isEmpty) return this.copyFrom(other)
        const left = Math.min(this.x, other.x)
        const top = Math.min(this.y, other.y)
        const right = Math.max(this.right, other.x + other.width)
        const bottom = Math.max(this.bottom, other.y + other.height)
        return this.set(left, top, right - left, bottom - top)
    }
}

/** The area of the smallest rectangle holding two others. */
export function unionArea(a: Readonly<Rect>, b: Readonly<Rect>): number {
    const width = Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x)
    const height = Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y)
    return width * height
}

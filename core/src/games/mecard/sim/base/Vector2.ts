import { numberText } from "./text"

/**
 * A point or a move in the arena, in meters, y going down. Immutable, so a position handed out can never be
 * changed behind the back of its owner.
 *
 * @remarks
 * It turns without trigonometry: a quarter turn swaps the coordinates, an eighth multiplies by `√½`, and a
 * direction toward a point is normalized with `sqrt`, exact in IEEE. `Math.sin` and `Math.cos` differ in
 * their last bits from one version of V8 to the next, and the simulation must not.
 */
export class Vector2 {


    /** No move. */
    public static readonly ZERO = new Vector2(0, 0)

    /** A meter toward the top of the arena. */
    public static readonly UP = new Vector2(0, -1)

    /** A meter toward the right of the arena. */
    public static readonly RIGHT = new Vector2(1, 0)

    /** A meter toward the bottom of the arena. */
    public static readonly DOWN = new Vector2(0, 1)

    /** A meter toward the left of the arena. */
    public static readonly LEFT = new Vector2(-1, 0)

    public readonly x: number
    public readonly y: number

    constructor(x: number, y: number){
        // Adding zero turns a -0, which a quarter turn gives, into 0, so equal vectors compare equal.
        this.x = x + 0
        this.y = y + 0
    }


    /** The point reached by moving from this one by another vector. */
    public plus(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y)
    }

    /** The move leading from another point to this one. */
    public minus(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y)
    }

    /** The same move, a number of times longer. */
    public times(factor: number): Vector2 {
        return new Vector2(this.x * factor, this.y * factor)
    }

    /** How long the move is. */
    public get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    /** The same direction, a meter long, none for no move. */
    public get normalized(): Vector2|null {
        const length = this.length
        return length === 0 ? null : this.times(1 / length)
    }

    /** How far another point lies. */
    public distance(other: Vector2): number {
        return other.minus(this).length
    }

    /** The dot product: the length of the other along this one, when this one is a meter long. */
    public dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y
    }

    /** The same vector turned a quarter clockwise, on an arena whose y goes down. */
    public get right(): Vector2 { return new Vector2(-this.y, this.x) }

    /** The same vector turned a quarter counterclockwise, on an arena whose y goes down. */
    public get left(): Vector2 { return new Vector2(this.y, -this.x) }

    /** The same vector turned around. */
    public get opposite(): Vector2 { return new Vector2(-this.x, -this.y) }

    /**
     * The same vector turned an eighth, clockwise toward positive `side`, counterclockwise toward negative.
     */
    public eighth(side: 1|-1): Vector2 {
        const turned = side > 0 ? this.right : this.left
        return this.plus(turned).times(Math.SQRT1_2)
    }

    /** Is it the same point as another? */
    public equals(other: Vector2): boolean {
        return this.x === other.x && this.y === other.y
    }

    /** Its coordinates, rounded: `(1.5, -2)`. */
    public toString(): string {
        return `(${numberText(this.x)}, ${numberText(this.y)})`
    }

    /**
     * The absolute offset of a move given relative to a facing a meter long: `forward` meters ahead and
     * `side` meters to the right of it.
     */
    public static relative(facing: Vector2, forward: number, side: number): Vector2 {
        return facing.times(forward).plus(facing.right.times(side))
    }
}

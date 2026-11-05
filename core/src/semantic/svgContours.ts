/** A point of a contour. */
export interface ContourPoint {
    readonly x: number
    readonly y: number
}

/**
 * How many straight sides a curve as long as the side of the square of its path is cut into: a picture is
 * drawn as tall as a line, a dozen pixels, so a side never spans more than a pixel or two.
 */
const SIDES_PER_SIZE = 16

/** The most sides a single curve is cut into, however long it is. */
const MAX_CURVE_SIDES = 64

/** How many numbers each command takes, by its uppercase letter. */
const ARITY: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

/**
 * The contours of the `d` of an SVG path, each a polygon to fill: a new one at each move. Every command is
 * read, in either case, the curves and the arcs cut into straight sides, and numbers after a command
 * repeat it, as SVG does, a move going on as a line.
 *
 * @param size - The side of the square the path is drawn in, so a curve is cut finely enough for it.
 * @throws {@link Error} When the path holds an unknown command, or a command lacks its numbers.
 */
export function svgContours(path: string, size: number): ContourPoint[][] {
    const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
    const pen = new Pen(size)
    let at = 0
    let command = ""
    const numbers = (count: number): number[] => {
        const read = tokens.slice(at, at + count).map(Number)
        if(read.length < count || read.some(value => !Number.isFinite(value))){
            throw new Error(`The SVG path "${path}" lacks a number after its "${command}".`)
        }
        at += count
        return read
    }
    while(at < tokens.length){
        if(/[a-zA-Z]/.test(tokens[at])) command = tokens[at++]
        const upper = command.toUpperCase()
        if(!(upper in ARITY)) throw new Error(`The SVG path "${path}" holds an unknown command "${command}".`)
        pen.relative = command !== upper
        pen.command(upper, numbers(ARITY[upper]))
        // A close takes no number, so one after it is an error rather than a repeat. A move goes on as lines.
        if(upper === "Z") command = ""
        else if(upper === "M") command = pen.relative ? "l" : "L"
    }
    return pen.contours()
}

/** What draws the contours of a path, command by command. */
class Pen {


    /** Are the numbers of the command being read relative to the pen? */
    public relative = false

    constructor(
        /** The side of the square of the path. */
        public readonly size: number,
    ){}


    public command(name: string, n: readonly number[]): void {
        switch(name){
            case "M": return this.#move(this.#x(n[0]), this.#y(n[1]))
            case "L": return this.#line(this.#x(n[0]), this.#y(n[1]))
            case "H": return this.#line(this.#x(n[0]), this.#pen.y)
            case "V": return this.#line(this.#pen.x, this.#y(n[0]))
            case "C": return this.#cubic(this.#point(n[0], n[1]), this.#point(n[2], n[3]), this.#point(n[4], n[5]))
            case "S": return this.#cubic(this.#mirror("C"), this.#point(n[0], n[1]), this.#point(n[2], n[3]))
            case "Q": return this.#quadratic(this.#point(n[0], n[1]), this.#point(n[2], n[3]))
            case "T": return this.#quadratic(this.#mirror("Q"), this.#point(n[0], n[1]))
            case "A": return this.#arc(n[0], n[1], n[2], n[3] !== 0, n[4] !== 0, this.#point(n[5], n[6]))
            default: return this.#close()
        }
    }

    /** Every contour drawn, the one being drawn included. */
    public contours(): ContourPoint[][] {
        this.#end()
        return this.#contours
    }


    readonly #contours: ContourPoint[][] = []
    #contour: ContourPoint[] = []
    #pen: ContourPoint = { x: 0, y: 0 }
    #start: ContourPoint = { x: 0, y: 0 }

    /** The last control point of the curve just drawn and its kind, which a smooth curve mirrors. */
    #control: { readonly point: ContourPoint, readonly kind: "C"|"Q" }|null = null

    #x(x: number): number { return this.relative ? this.#pen.x + x : x }
    #y(y: number): number { return this.relative ? this.#pen.y + y : y }
    #point(x: number, y: number): ContourPoint { return { x: this.#x(x), y: this.#y(y) } }

    /** The control point of a smooth curve: the last one mirrored around the pen, else the pen itself. */
    #mirror(kind: "C"|"Q"): ContourPoint {
        const control = this.#control
        if(control?.kind !== kind) return this.#pen
        return { x: 2 * this.#pen.x - control.point.x, y: 2 * this.#pen.y - control.point.y }
    }

    #end(): void {
        if(this.#contour.length > 0) this.#contours.push(this.#contour)
        this.#contour = []
    }

    #move(x: number, y: number): void {
        this.#end()
        this.#pen = { x, y }
        this.#start = this.#pen
        this.#contour.push(this.#pen)
        this.#control = null
    }

    #line(x: number, y: number): void {
        this.#to({ x, y })
        this.#control = null
    }

    #close(): void {
        this.#end()
        this.#pen = this.#start
        this.#control = null
    }

    /** Add a point, from a pen that was never moved starting from its origin. */
    #to(point: ContourPoint): void {
        if(this.#contour.length === 0) this.#contour.push(this.#pen)
        this.#contour.push(point)
        this.#pen = point
    }

    /** How many straight sides a curve whose control points run a length is cut into. */
    #sides(length: number): number {
        return Math.min(MAX_CURVE_SIDES, Math.max(1, Math.ceil(length / this.size * SIDES_PER_SIZE)))
    }

    #cubic(c1: ContourPoint, c2: ContourPoint, end: ContourPoint): void {
        const p0 = this.#pen
        const sides = this.#sides(distance(p0, c1) + distance(c1, c2) + distance(c2, end))
        for(let i = 1; i <= sides; i++){
            const t = i / sides
            const u = 1 - t
            const a = u * u * u
            const b = 3 * u * u * t
            const c = 3 * u * t * t
            const d = t * t * t
            this.#to({
                x: a * p0.x + b * c1.x + c * c2.x + d * end.x,
                y: a * p0.y + b * c1.y + c * c2.y + d * end.y,
            })
        }
        this.#control = { point: c2, kind: "C" }
    }

    #quadratic(control: ContourPoint, end: ContourPoint): void {
        const p0 = this.#pen
        const sides = this.#sides(distance(p0, control) + distance(control, end))
        for(let i = 1; i <= sides; i++){
            const t = i / sides
            const u = 1 - t
            this.#to({
                x: u * u * p0.x + 2 * u * t * control.x + t * t * end.x,
                y: u * u * p0.y + 2 * u * t * control.y + t * t * end.y,
            })
        }
        this.#control = { point: control, kind: "Q" }
    }

    /**
     * An elliptical arc to a point, as SVG gives it: by its radii, the turn of its axes in degrees, and
     * which of the four arcs joining the two points it is. Too small radii grow until the arc reaches.
     */
    #arc(rx: number, ry: number, degrees: number, large: boolean, sweep: boolean, end: ContourPoint): void {
        const start = this.#pen
        this.#control = null
        rx = Math.abs(rx)
        ry = Math.abs(ry)
        if(rx === 0 || ry === 0 || (start.x === end.x && start.y === end.y)){
            this.#to(end)
            return
        }
        // From the two ends to the center, as the implementation notes of SVG lay it out (F.6.5).
        const phi = degrees * Math.PI / 180
        const cos = Math.cos(phi)
        const sin = Math.sin(phi)
        const hx = (start.x - end.x) / 2
        const hy = (start.y - end.y) / 2
        const x1 = cos * hx + sin * hy
        const y1 = -sin * hx + cos * hy
        const reach = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
        if(reach > 1){
            rx *= Math.sqrt(reach)
            ry *= Math.sqrt(reach)
        }
        const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
        const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
        const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator))
        const cx1 = factor * rx * y1 / ry
        const cy1 = -factor * ry * x1 / rx
        const cx = cos * cx1 - sin * cy1 + (start.x + end.x) / 2
        const cy = sin * cx1 + cos * cy1 + (start.y + end.y) / 2
        const from = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx)
        let turn = Math.atan2((-y1 - cy1) / ry, (-x1 - cx1) / rx) - from
        if(sweep && turn < 0) turn += 2 * Math.PI
        if(!sweep && turn > 0) turn -= 2 * Math.PI
        const sides = this.#sides(Math.abs(turn) * Math.max(rx, ry))
        for(let i = 1; i < sides; i++){
            const angle = from + turn * i / sides
            const ex = rx * Math.cos(angle)
            const ey = ry * Math.sin(angle)
            this.#to({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy })
        }
        // The last point is the end itself, so the rounding of the angles never leaves a gap.
        this.#to(end)
    }
}

function distance(a: ContourPoint, b: ContourPoint): number {
    return Math.hypot(b.x - a.x, b.y - a.y)
}

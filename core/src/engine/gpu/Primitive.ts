/**
 * How a run of vertices is read into shapes: one of the seven drawing modes of WebGL. A closed set of
 * values, each a static of this class. WebGL 1 has no quad: a quad is an indexed `TRIANGLES` of 4
 * vertices and 6 indices.
 */
export class Primitive {


    /** Each vertex is a point. */
    public static readonly POINTS = new Primitive(0x0000, 1, 1, 0, null)

    /** Each pair of vertices is a segment. */
    public static readonly LINES = new Primitive(0x0001, 2, 2, 1, null)

    /** Each vertex joins the previous one, and the last one joins the first. */
    public static readonly LINE_LOOP = new Primitive(0x0002, 2, 1, 1, Primitive.LINES)

    /** Each vertex joins the previous one. */
    public static readonly LINE_STRIP = new Primitive(0x0003, 2, 1, 1, Primitive.LINES)

    /** Each three vertices are a triangle. */
    public static readonly TRIANGLES = new Primitive(0x0004, 3, 3, 2, null)

    /** Each vertex makes a triangle with the two before it. */
    public static readonly TRIANGLE_STRIP = new Primitive(0x0005, 3, 1, 2, Primitive.TRIANGLES)

    /** Each vertex makes a triangle with the one before it and the first one. */
    public static readonly TRIANGLE_FAN = new Primitive(0x0006, 3, 1, 2, Primitive.TRIANGLES)

    /** The primitive drawing the same shapes as independent pieces, itself when it already does. */
    public readonly list: Primitive

    /**
     * Does each primitive stand alone? Only then can two runs be put end to end: a strip or a loop
     * would join the last vertex of one run to the first of the next.
     */
    public readonly isIndependent: boolean

    private constructor(
        /**
         * The WebGL drawing mode, by its value in the specification, so it exists without a context: reading
         * it on `WebGLRenderingContext` would take a global, which core forbids itself.
         */
        public readonly glId: number,

        /** How many vertices the first primitive takes. */
        public readonly verticesOfFirst: number,

        /** How many vertices each primitive after the first adds. */
        public readonly verticesOfNext: number,

        /** Points, lines or triangles: 0, 1 or 2. */
        public readonly dimension: 0|1|2,

        list: Primitive|null,
    ){
        this.list = list ?? this
        this.isIndependent = verticesOfFirst === verticesOfNext
    }


    /** How many primitives a run of vertices draws. */
    public countOf(vertices: number): number {
        if(vertices < this.verticesOfFirst) return 0
        return 1 + Math.floor((vertices - this.verticesOfFirst) / this.verticesOfNext)
    }

    /** Can a run of this many vertices be drawn without leftover vertices? An empty run can. */
    public fits(vertices: number): boolean {
        if(vertices === 0) return true
        const leftover = (vertices - this.verticesOfFirst) % this.verticesOfNext
        return vertices >= this.verticesOfFirst && leftover === 0
    }
}

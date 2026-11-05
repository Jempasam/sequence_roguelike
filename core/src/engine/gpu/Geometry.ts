import type { Mat4 } from "../math"

import type { DataLayout } from "./Shader"

/** The most vertices one draw call or one `Model` holds, since the indices have 16 bits. */
export const MAX_VERTICES = 65535

/** Where the attributes of a vertex start, in bytes. */
export const POSITION_OFFSET = 0
export const UV_OFFSET = 12
export const COLOR_OFFSET = 16
export const DATA_OFFSET = 20

/**
 * The numbers describing a vertex handed to the engine: its position `x, y, z`, its texture coordinates
 * `u, v` in texels, and its color `r, g, b, a` from 0 to 1, alpha not premultiplied.
 */
export const RAW_VERTEX_SIZE = 9

/** The size of a vertex for each layout of `aData`, in bytes. */
const STRIDES: Readonly<Record<DataLayout, number>> = { none: 20, bytes: 24, floats: 36 }

/** The largest value of a byte, 1 once normalized. */
const BYTE_MAX = 255

/** The size of a vertex in a layout of `aData`, in bytes. */
export function strideOf(layout: DataLayout): number {
    return STRIDES[layout]
}

/**
 * Pack a color into the four normalized bytes of `aColor`, premultiplying it.
 *
 * @param r - The color, alpha not premultiplied, from 0 to 1. Values outside are clamped.
 * @param written - The alpha written, apart from the one that premultiplies: 0 makes it additive.
 */
export function packColor(r: number, g: number, b: number, a: number, written = a): number {
    const alpha = clamp(a)
    // The bytes are read back in memory order, r first, which is the low byte on little-endian, the only
    // byte order Gpu accepts.
    const rgb = toByte(r * alpha) | toByte(g * alpha) << 8 | toByte(b * alpha) << 16
    return (rgb | toByte(written) << 24) >>> 0
}

/**
 * Refuse values of `aData` the layout would lose: any value at all for a shader reading none, and a value
 * outside 0 to 1 for bytes, rather than clamping it in silence.
 *
 * @throws {@link Error} When the layout cannot hold the values.
 */
export function checkData(layout: DataLayout, d0: number, d1: number, d2: number, d3: number): void {
    if(layout === "none" && (d0 !== 0 || d1 !== 0 || d2 !== 0 || d3 !== 0)){
        throw new Error("Data was set for a shader reading no aData. Create the shader with a data layout.")
    }
    const isOutside = (d: number) => !(d >= 0 && d <= 1)
    if(layout === "bytes" && (isOutside(d0) || isOutside(d1) || isOutside(d2) || isOutside(d3))){
        throw new Error(`The data (${d0}, ${d1}, ${d2}, ${d3}) leaves 0 to 1, which a "bytes" shader cannot hold.`
            + ' Use a "floats" layout.')
    }
}

/**
 * Vertices and indices in the vertex format of the engine, in memory, on their way to the GPU: the batch
 * of `Gpu`, or a `Model` being recorded by a `ModelSurface`.
 *
 * @remarks
 * A draw calls {@link Geometry.begin}, then writes its vertices with {@link Geometry.vertex} and its
 * indices with {@link Geometry.index}, relative to its own first vertex. The colors are written as one
 * `Uint32`, through a view on the same buffer as the floats.
 */
export class Geometry {


    /**
     * @param growable - Does it grow when a draw does not fit? The batch does not: it is flushed instead.
     */
    constructor(layout: DataLayout, vertexCapacity: number, indexCapacity: number, growable: boolean){
        this.#layout = layout
        this.#stride = strideOf(layout)
        this.#growable = growable
        this.#allocate(vertexCapacity, new Uint16Array(indexCapacity))
    }


    public get layout(): DataLayout { return this.#layout }

    /** The size of a vertex, in bytes. */
    public get stride(): number { return this.#stride }

    public get vertexCount(): number { return this.#vertexCount }

    public get indexCount(): number { return this.#indexCount }

    /** Is there nothing in it? */
    public get isEmpty(): boolean { return this.#indexCount === 0 && this.#vertexCount === 0 }

    /** The bytes of the vertices written so far. */
    public get vertexBytes(): Uint8Array {
        return this.#u8.subarray(0, this.#vertexCount * this.#stride)
    }

    /** The indices written so far. */
    public get indices(): Uint16Array {
        return this.#indices.subarray(0, this.#indexCount)
    }

    /** Does a draw of this size still fit without growing? */
    public fits(vertices: number, indices: number): boolean {
        return this.#vertexCount + vertices <= this.#vertexCapacity
            && this.#indexCount + indices <= this.#indices.length
    }

    /** Change the layout of `aData` the vertices are written in. Only an empty geometry changes it. */
    public setLayout(layout: DataLayout): void {
        if(layout === this.#layout) return
        if(!this.isEmpty) throw new Error("A geometry changes its layout only when empty.")
        this.#layout = layout
        this.#stride = strideOf(layout)
        this.#allocate(this.#vertexCapacity, this.#indices)
    }

    /** Make room for a draw, whose indices count from the vertex written next. */
    public begin(vertices: number, indices: number): void {
        if(!this.fits(vertices, indices)){
            if(!this.#growable) throw new Error("A batch got a draw it has no room for. Flush it first.")
            this.#grow(this.#vertexCount + vertices, this.#indexCount + indices)
        }
        this.#base = this.#vertexCount
    }

    /**
     * Write a vertex.
     *
     * @param u - The texture coordinates, in texels.
     * @param color - The color, packed by {@link packColor}.
     * @param d0 - The four values of `aData`, ignored by a layout without it.
     */
    public vertex(
        x: number, y: number, z: number, u: number, v: number, color: number,
        d0: number, d1: number, d2: number, d3: number,
    ): void {
        const offset = this.#vertexCount * this.#stride
        const f = offset >> 2
        this.#f32[f] = x
        this.#f32[f + 1] = y
        this.#f32[f + 2] = z
        this.#u16[(offset + UV_OFFSET) >> 1] = u
        this.#u16[((offset + UV_OFFSET) >> 1) + 1] = v
        this.#u32[(offset + COLOR_OFFSET) >> 2] = color
        if(this.#layout === "bytes"){
            const b = offset + DATA_OFFSET
            this.#u8[b] = toByte(d0)
            this.#u8[b + 1] = toByte(d1)
            this.#u8[b + 2] = toByte(d2)
            this.#u8[b + 3] = toByte(d3)
        } else if(this.#layout === "floats"){
            const d = (offset + DATA_OFFSET) >> 2
            this.#f32[d] = d0
            this.#f32[d + 1] = d1
            this.#f32[d + 2] = d2
            this.#f32[d + 3] = d3
        }
        this.#vertexCount++
    }

    /** Write an index, counted from the first vertex of the current draw. */
    public index(index: number): void {
        this.#indices[this.#indexCount++] = this.#base + index
    }

    /**
     * Copy vertices written in the same layout, moved and tinted: the geometry of a `Model` absorbed into
     * another one.
     *
     * @param tint - The tint, premultiplied, as four floats.
     */
    public absorb(source: ArrayBuffer, count: number, transform: Mat4, tint: Float32Array): void {
        const from = new Float32Array(source)
        const fromColors = new Uint8Array(source)
        const m = transform.elements
        const start = this.#vertexCount * this.#stride
        this.#u8.set(new Uint8Array(source, 0, count * this.#stride), start)
        for(let i = 0; i < count; i++){
            const offset = i * this.#stride
            const f = offset >> 2
            const x = from[f]
            const y = from[f + 1]
            const z = from[f + 2]
            const out = (start + offset) >> 2
            this.#f32[out] = m[0] * x + m[4] * y + m[8] * z + m[12]
            this.#f32[out + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
            this.#f32[out + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
            const c = offset + COLOR_OFFSET
            for(let k = 0; k < 4; k++){
                this.#u8[start + c + k] = Math.round(fromColors[c + k] * clamp(tint[k]))
            }
        }
        this.#vertexCount += count
    }

    /** Forget every vertex and index, keeping the memory. */
    public clear(): void {
        this.#vertexCount = 0
        this.#indexCount = 0
        this.#base = 0
    }


    #layout: DataLayout
    #stride: number
    readonly #growable: boolean
    #vertexCapacity = 0
    #f32 = new Float32Array(0)
    #u32 = new Uint32Array(0)
    #u16 = new Uint16Array(0)
    #u8 = new Uint8Array(0)
    #indices = new Uint16Array(0)
    #vertexCount = 0
    #indexCount = 0

    /** The first vertex of the current draw, which its indices count from. */
    #base = 0

    #allocate(vertexCapacity: number, indices: Uint16Array<ArrayBuffer>): void {
        const buffer = new ArrayBuffer(vertexCapacity * this.#stride)
        if(this.#vertexCount > 0) new Uint8Array(buffer).set(this.vertexBytes)
        this.#vertexCapacity = vertexCapacity
        this.#f32 = new Float32Array(buffer)
        this.#u32 = new Uint32Array(buffer)
        this.#u16 = new Uint16Array(buffer)
        this.#u8 = new Uint8Array(buffer)
        this.#indices = indices
    }

    /** Double the capacities until a draw fits, keeping what is written. */
    #grow(vertices: number, indices: number): void {
        let vertexCapacity = Math.max(1, this.#vertexCapacity)
        while(vertexCapacity < vertices) vertexCapacity *= 2
        let indexCapacity = Math.max(1, this.#indices.length)
        while(indexCapacity < indices) indexCapacity *= 2
        const grown = new Uint16Array(indexCapacity)
        grown.set(this.indices)
        this.#allocate(vertexCapacity, grown)
    }
}

function clamp(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value
}

function toByte(value: number): number {
    return Math.round(clamp(value) * BYTE_MAX)
}

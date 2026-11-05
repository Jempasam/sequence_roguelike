import { blendStateOf, DrawKey } from "./DrawKey"
import type { BlendMode, BlendState, ColorMode, DepthTest } from "./DrawKey"
import { checkData, Geometry, MAX_VERTICES, packColor, RAW_VERTEX_SIZE } from "./Geometry"
import type { Gpu } from "./Gpu"
import type { Material } from "./Material"
import { Mesh } from "./Mesh"
import type { Primitive } from "./Primitive"
import type { Texture } from "./Texture"

/** A geometry made by hand, to upload as a {@link Model}. */
export interface ModelDescription {
    /** The primitive the indices are read with, strips included. */
    readonly primitive: Primitive

    /** The vertices, `RAW_VERTEX_SIZE` numbers each: `x, y, z, u, v, r, g, b, a`. */
    readonly vertices: ArrayLike<number>

    /** The indices of the vertices, a count the primitive fits. */
    readonly indices: ArrayLike<number>

    /** The texture, the white texel of the GPU when none. */
    readonly texture?: Texture

    /** The material, the standard one when none. */
    readonly material?: Material

    /** How it is blended, `"cutout"` when none. */
    readonly blend?: BlendMode

    /** How the color of the vertices applies, `"modulate"` when none. */
    readonly colorMode?: ColorMode

    /** Which fragments pass the depth test, `"nearer-or-equal"` when none. */
    readonly depthTest?: DepthTest

    /** The values of `aData`, 4 per vertex, for a material whose shader reads them. Zeros when none. */
    readonly data?: ArrayLike<number>
}

/**
 * One geometry drawn in a single call: vertices, indices, and the key of their draw, which they were
 * written for.
 *
 * @remarks
 * It owns its geometry. The texture and the material are referenced: a replay shows their current value,
 * the current content of a `RenderTexture` or the time animating water in the uniforms. That is on purpose.
 * The environment, the clip, the light and the colorization, is the one of the replay.
 *
 * It comes from {@link Model.create} by hand, or from `ModelSurface.build`. Both give the same object.
 * It keeps a copy of its vertices on the CPU, so a `ModelSurface` can absorb it into another model.
 *
 * Nothing guarantees its triangles are drawn in the order they were recorded. With `"cutout"`, the depth
 * test makes the order irrelevant. With `"alpha"`, or surfaces at equal depth, a group whose order matters
 * is drawn into a texture.
 */
export class Model {


    /** The primitive the indices are read with. */
    public readonly primitive: Primitive

    public readonly texture: Texture
    public readonly material: Material

    /**
     * The GL state of its blend mode: `"alpha"` and `"additive"` are both `"over"`, told apart by their
     * vertices.
     */
    public readonly blend: BlendState

    /** How the color of the vertices applies: multiplied, or replacing the hue. */
    public readonly colorMode: ColorMode

    /** Which fragments pass the depth test. */
    public readonly depthTest: DepthTest

    /** A CPU copy of the vertices, in the layout of the shader of the material. */
    public readonly vertices: ArrayBuffer

    public readonly indices: Uint16Array

    public readonly vertexCount: number

    /** The key of its draw, its primitive in list form, which a surface absorbing it compares. */
    public readonly key: DrawKey

    /** Its buffers on the GPU. */
    public readonly mesh: Mesh

    /**
     * Upload a geometry already in the vertex format of the engine. {@link Model.create} makes one by hand.
     *
     * @param key - The key of the draw. The model keeps a copy.
     */
    constructor(gpu: Gpu, key: DrawKey, primitive: Primitive, geometry: Geometry){
        if(geometry.vertexCount > MAX_VERTICES) throw new Error(`A Model holds at most ${MAX_VERTICES} vertices.`)
        this.key = key.clone()
        this.key.primitive = primitive.list
        this.primitive = primitive
        this.texture = key.texture
        this.material = key.material
        this.blend = key.blend
        this.colorMode = key.colorMode
        this.depthTest = key.depthTest
        this.vertices = geometry.vertexBytes.slice().buffer
        this.indices = geometry.indices.slice()
        this.vertexCount = geometry.vertexCount
        this.mesh = new Mesh(gpu, geometry.layout, geometry.vertexBytes, geometry.indices)
    }

    /**
     * Upload a geometry made by hand, and own it.
     *
     * @throws {@link Error} When the primitive does not fit the indices, an index is outside the vertices,
     * there are more than 65 535 vertices, or the data does not fit the layout of the shader.
     */
    public static create(gpu: Gpu, description: ModelDescription): Model {
        const { primitive, vertices, indices } = description
        const material = description.material ?? gpu.standardMaterial
        const layout = material.shader.layout
        const blend = description.blend ?? "cutout"
        const count = vertices.length / RAW_VERTEX_SIZE
        if(!Number.isInteger(count)) throw new Error(`A vertex takes ${RAW_VERTEX_SIZE} numbers, which the vertices do not divide into.`)
        if(count > MAX_VERTICES) throw new Error(`A Model holds at most ${MAX_VERTICES} vertices, not ${count}.`)
        if(!primitive.fits(indices.length)) throw new Error(`${indices.length} indices leave vertices over for this primitive.`)
        const data = description.data
        if(data && data.length !== count * 4) throw new Error("The data takes 4 values per vertex.")
        const geometry = new Geometry(layout, count, indices.length, false)
        geometry.begin(count, indices.length)
        for(let i = 0; i < count; i++){
            const v = i * RAW_VERTEX_SIZE
            const a = vertices[v + 8]
            const color = packColor(vertices[v + 5], vertices[v + 6], vertices[v + 7], a, blend === "additive" ? 0 : a)
            const d = i * 4
            const [d0, d1, d2, d3] = data ? [data[d], data[d + 1], data[d + 2], data[d + 3]] : [0, 0, 0, 0]
            checkData(layout, d0, d1, d2, d3)
            const x = vertices[v]
            const y = vertices[v + 1]
            const z = vertices[v + 2]
            geometry.vertex(x, y, z, vertices[v + 3], vertices[v + 4], color, d0, d1, d2, d3)
        }
        for(let i = 0; i < indices.length; i++){
            if(!(indices[i] >= 0 && indices[i] < count)) throw new Error(`Index ${indices[i]} is outside the ${count} vertices.`)
            geometry.index(indices[i])
        }
        const texture = description.texture ?? gpu.white.texture
        const key = new DrawKey(texture, material, primitive.list, blendStateOf(blend),
            description.colorMode, description.depthTest)
        return new Model(gpu, key, primitive, geometry)
    }


    /** Was its geometry freed? */
    public get disposed(): boolean { return this.#disposed }

    /** Free its geometry. Drawing it afterwards throws, as does replaying a `MultiModel` placing it. */
    public dispose(): void {
        if(this.#disposed) return
        this.mesh.dispose()
        this.#disposed = true
    }


    #disposed = false
}

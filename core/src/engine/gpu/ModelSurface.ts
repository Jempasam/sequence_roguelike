import { Color, Mat4 } from "../math"

import type { DrawEnvironment } from "./DrawEnvironment"
import type { DrawKey } from "./DrawKey"
import { Geometry, MAX_VERTICES } from "./Geometry"
import type { Gpu } from "./Gpu"
import { listIndices } from "./listIndices"
import { Model } from "./Model"
import type { MultiModel } from "./MultiModel"
import type { Surface } from "./Surface"

/** The room a recording starts with, in vertices, grown as needed. */
const INITIAL_VERTICES = 256

/**
 * A recording that flattens what is drawn into a single `Model`: one geometry, one draw call. The tiles of
 * a room, baked once, then replayed every frame.
 *
 * @remarks
 * The first draw locks the key of the surface, since a model is drawn in one call: every later draw has to
 * share it, or it throws. Without the lock, the surface would either drop part of the state in silence, or
 * build a wrong model. It does not know the fields of the key, so an option added to `DrawKey` is taken
 * into account here without a change.
 *
 * It also throws, before writing anything, on a draw that would exceed 65 535 vertices, a draw under an
 * environment that is not the default one, since a clip, a light or a colorization exists only at replay,
 * and the `"multiply"` and `"copy"` blends, which a replay does not draw as a texture would.
 *
 * Strips, fans and loops are converted to lists, so two of them put end to end are not joined.
 */
export class ModelSurface implements Surface {


    constructor(
        /** The GPU the model is uploaded to. */
        public readonly gpu: Gpu,
    ){}


    /** Has nothing been drawn yet? */
    public get isEmpty(): boolean { return this.#key === null }

    /** Why a draw would be refused, none when it would be accepted. Nothing is written. */
    public refusalOf(key: DrawKey, environment: DrawEnvironment, vertices: number): string|null {
        const general = ModelSurface.generalRefusalOf(key, environment, vertices)
        if(general) return general
        if(this.#key && !this.#key.equals(key)){
            return "A draw into a ModelSurface has another key than its first one: another texture, material,"
                + " primitive, blend, color mode or depth test. Draw it into a MultiModelSurface instead."
        }
        if(this.#geometry.vertexCount + vertices > MAX_VERTICES){
            return `A ModelSurface holds at most ${MAX_VERTICES} vertices. Cut what is drawn into several models.`
        }
        return null
    }

    /** Would a draw be accepted? Nothing is written. */
    public accepts(key: DrawKey, environment: DrawEnvironment, vertices: number): boolean {
        return this.refusalOf(key, environment, vertices) === null
    }

    public reserve(key: DrawKey, environment: DrawEnvironment, vertices: number, indices: number): Geometry {
        this.#take(key, environment, vertices)
        this.#geometry.begin(vertices, indices)
        return this.#geometry
    }

    /** Copy the geometry of a model, moved and tinted, if its key is the one of the surface. */
    public placeModel(model: Model, transform: Mat4, tint: Color, environment: DrawEnvironment): void {
        this.#take(model.key, environment, model.vertexCount)
        this.#absorb(model, transform, tint)
    }

    /** Copy the geometry of every model a multi-model places, or none when one of them is refused. */
    public placeMultiModel(
        multiModel: MultiModel, transform: Mat4, tint: Color, environment: DrawEnvironment,
    ): void {
        const placements = multiModel.placements
        if(placements.length === 0) return
        // Checked as a whole first, against the key the first placement would lock, so a refusal writes
        // nothing.
        const locked = this.#key ?? placements[0].model.key
        let vertices = this.#geometry.vertexCount
        for(const { model } of placements){
            vertices += model.vertexCount
            const refusal = ModelSurface.generalRefusalOf(model.key, environment, model.vertexCount)
            if(refusal) throw new Error(refusal)
            if(!locked.equals(model.key)) throw new Error("A MultiModel drawn into a ModelSurface places models of other keys.")
            if(vertices > MAX_VERTICES) throw new Error(`A ModelSurface holds at most ${MAX_VERTICES} vertices.`)
        }
        for(const placement of placements){
            this.#transform.setProduct(transform, placement.transform)
            this.#tint.copyFrom(tint).multiply(placement.tint)
            this.#take(placement.model.key, environment, placement.model.vertexCount)
            this.#absorb(placement.model, this.#transform, this.#tint)
        }
    }

    /**
     * Upload what was drawn as a model, and start empty again.
     *
     * @throws {@link Error} When nothing was drawn, since no key was locked.
     */
    public build(): Model {
        const key = this.#key
        if(!key) throw new Error("A ModelSurface built with nothing drawn has no key. Draw something first.")
        const model = new Model(this.gpu, key, key.primitive, this.#geometry)
        this.#key = null
        this.#geometry.clear()
        return model
    }

    /** Why a draw would be refused by any recording, whatever was drawn before, none when it would not be. */
    public static generalRefusalOf(
        key: DrawKey, environment: DrawEnvironment, vertices: number,
    ): string|null {
        if(!environment.isDefault){
            return "A recording was drawn into under a clip, a light, a colorization, a line width or a point size."
                + " Those exist only at replay: push() before them, and pop() before recording."
        }
        if(key.blend === "multiply" || key.blend === "copy"){
            return `A recording refuses the "${key.blend}" blend, which a replay would not draw as a texture`
                + " does. Draw it into a TextureSurface instead."
        }
        if(vertices > MAX_VERTICES) return `A recording holds at most ${MAX_VERTICES} vertices in one model.`
        return null
    }


    /** The key locked by the first draw, none before it. */
    #key: DrawKey|null = null

    readonly #geometry = new Geometry("none", INITIAL_VERTICES, INITIAL_VERTICES * 3, true)
    readonly #transform = new Mat4()
    readonly #tint = new Color()
    readonly #premultipliedTint = new Float32Array(4)

    /** Accept a draw, locking the key when it is the first one. */
    #take(key: DrawKey, environment: DrawEnvironment, vertices: number): void {
        const refusal = this.refusalOf(key, environment, vertices)
        if(refusal) throw new Error(refusal)
        if(this.#key) return
        this.#key = key.clone()
        this.#geometry.setLayout(key.material.shader.layout)
    }

    #absorb(model: Model, transform: Mat4, tint: Color): void {
        const { primitive } = model
        const indices = primitive.isIndependent ? model.indices : listIndices(primitive, model.indices)
        this.#geometry.begin(model.vertexCount, indices.length)
        this.#premultipliedTint.set([tint.r * tint.a, tint.g * tint.a, tint.b * tint.a, tint.a])
        this.#geometry.absorb(model.vertices, model.vertexCount, transform, this.#premultipliedTint)
        for(let i = 0; i < indices.length; i++) this.#geometry.index(indices[i])
    }
}

import { Color, Mat4 } from "../math"

import type { DrawEnvironment } from "./DrawEnvironment"
import type { DrawKey } from "./DrawKey"
import type { Geometry } from "./Geometry"
import type { Gpu } from "./Gpu"
import type { Model } from "./Model"
import { ModelSurface } from "./ModelSurface"
import { MultiModel } from "./MultiModel"
import type { Placement } from "./MultiModel"
import type { Surface } from "./Surface"

/**
 * A recording that composes what is drawn into a `MultiModel`: as few models as there are keys, one call
 * each, without copying a model drawn into it.
 *
 * @remarks
 * It keeps a `ModelSurface` open for each key drawn so far. A draw goes into the first one that accepts
 * it, however old, and opens a new one only when none does: alternating two textures gives two models,
 * not one per switch.
 *
 * So the order of the draws is not kept. Two draws of different keys are replayed model by model, in the
 * order their keys first appeared. With `"cutout"`, the depth test decides what is in front and the
 * result is the same. With `"alpha"`, or two surfaces at equal depth, what overlaps may swap: a tile A of
 * atlas 1, a decoration of atlas 2, then a tile B of atlas 1 over it, comes out with B under the
 * decoration. A group whose order matters is recorded in a surface of its own, or drawn into a texture.
 *
 * A model drawn into it is not copied: it becomes a placement it does not own, with the current transform
 * and tint. Placing the same room three times costs no geometry.
 *
 * It refuses what a `ModelSurface` refuses whatever was drawn before: a draw under an environment that is
 * not the default one, the `"multiply"` and `"copy"` blends, and more than 65 535 vertices at once.
 */
export class MultiModelSurface implements Surface {


    constructor(
        /** The GPU the models are uploaded to. */
        public readonly gpu: Gpu,
    ){}


    public reserve(key: DrawKey, environment: DrawEnvironment, vertices: number, indices: number): Geometry {
        const refusal = ModelSurface.generalRefusalOf(key, environment, vertices)
        if(refusal) throw new Error(refusal)
        return this.#surfaceFor(key, environment, vertices).reserve(key, environment, vertices, indices)
    }

    /** Place a model as it is, without owning it. */
    public placeModel(model: Model, transform: Mat4, tint: Color, environment: DrawEnvironment): void {
        const refusal = ModelSurface.generalRefusalOf(model.key, environment, 0)
        if(refusal) throw new Error(refusal)
        this.#entries.push({ model, transform: transform.clone(), tint: tint.clone() })
    }

    /**
     * Place every model a multi-model places, the transform and the tint composed with its own, without
     * owning them.
     */
    public placeMultiModel(
        multiModel: MultiModel, transform: Mat4, tint: Color, environment: DrawEnvironment,
    ): void {
        for(const { model } of multiModel.placements){
            const refusal = ModelSurface.generalRefusalOf(model.key, environment, 0)
            if(refusal) throw new Error(refusal)
        }
        for(const placement of multiModel.placements){
            const composed = new Mat4().setProduct(transform, placement.transform)
            const composedTint = tint.clone().multiply(placement.tint)
            this.#entries.push({ model: placement.model, transform: composed, tint: composedTint })
        }
    }

    /** Build every open surface, and give what was drawn as a multi-model. The surface starts empty again. */
    public build(): MultiModel {
        const placements: Placement[] = []
        const owned: Model[] = []
        for(const entry of this.#entries){
            if(!(entry instanceof ModelSurface)){
                placements.push(entry)
                continue
            }
            if(entry.isEmpty) continue
            const model = entry.build()
            owned.push(model)
            placements.push({ model, transform: new Mat4(), tint: new Color() })
        }
        this.#entries = []
        return new MultiModel(placements, owned)
    }


    /**
     * The open surfaces and the placed models, in the order they appeared, which is the order of the
     * placements of the multi-model.
     */
    #entries: (ModelSurface|Placement)[] = []

    /** The first open surface accepting a draw, or a new one when none does. */
    #surfaceFor(key: DrawKey, environment: DrawEnvironment, vertices: number): ModelSurface {
        for(const entry of this.#entries){
            if(entry instanceof ModelSurface && entry.accepts(key, environment, vertices)) return entry
        }
        const surface = new ModelSurface(this.gpu)
        this.#entries.push(surface)
        return surface
    }
}

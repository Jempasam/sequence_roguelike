import type { Color, Mat4 } from "../math"

import type { Model } from "./Model"

/** A model, where and how tinted it is drawn. */
export interface Placement {
    readonly model: Model
    readonly transform: Mat4
    readonly tint: Color
}

/**
 * An ordered list of placements of models, drawn one call each: the same prebaked room placed three
 * times, or a tilemap whose tiles spread over two pages of atlas.
 *
 * @remarks
 * The placements are replayed in their order. Built by a `MultiModelSurface`, that order is the one of the
 * keys, not of the draws: nothing guarantees a multi-model draws in the order it was recorded, which only
 * shows with `"alpha"` or with surfaces at equal depth.
 *
 * It frees only the models it owns. A model freed while a multi-model still places it makes the replay
 * throw.
 */
export class MultiModel {


    /** The placements, in the order they are drawn. */
    public readonly placements: readonly Placement[]

    /**
     * @param placements - The placements, in the order they are drawn. Their transforms and tints are copied.
     * @param owned - The models it frees when disposed, all among the placements.
     * @throws {@link Error} When an owned model is not among the placements.
     */
    constructor(placements: readonly Placement[], owned: readonly Model[] = []){
        this.placements = placements.map(({ model, transform, tint }) => ({
            model, transform: transform.clone(), tint: tint.clone(),
        }))
        for(const model of owned){
            if(!placements.some(placement => placement.model === model)){
                throw new Error("A MultiModel owns a model it does not place.")
            }
        }
        this.#owned = [...new Set(owned)]
    }


    /** Free the models it owns, and only those. Disposing twice does nothing. */
    public dispose(): void {
        for(const model of this.#owned) model.dispose()
    }


    readonly #owned: readonly Model[]
}

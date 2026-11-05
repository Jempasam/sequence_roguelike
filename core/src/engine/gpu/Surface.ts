import type { Color, Mat4 } from "../math"

import type { DrawEnvironment } from "./DrawEnvironment"
import type { DrawKey } from "./DrawKey"
import type { Geometry } from "./Geometry"
import type { Model } from "./Model"
import type { MultiModel } from "./MultiModel"

/**
 * Where the vertices a painter emits end up: the screen, a texture, or a `Model` being recorded.
 *
 * @remarks
 * This is the split of Qt, a `QPainter` on a `QPaintDevice`. The state stack, the shapes and the sprites
 * are written once, in `Painter`. Only where the vertices go changes, here.
 */
export interface Surface {
    /**
     * Make room for a draw, and get the geometry to write it into.
     *
     * @throws {@link Error} When the surface refuses the draw. Nothing is written then.
     */
    reserve(key: DrawKey, environment: DrawEnvironment, vertices: number, indices: number): Geometry

    /**
     * Take a model, moved and tinted.
     *
     * @throws {@link Error} When the surface refuses the model. Nothing is written then.
     */
    placeModel(model: Model, transform: Mat4, tint: Color, environment: DrawEnvironment): void

    /**
     * Take each placement of a multi-model, in order, the transform and the tint composed with its own.
     *
     * @throws {@link Error} When the surface refuses one of the placements. Nothing is written then.
     */
    placeMultiModel(multiModel: MultiModel, transform: Mat4, tint: Color, environment: DrawEnvironment): void
}

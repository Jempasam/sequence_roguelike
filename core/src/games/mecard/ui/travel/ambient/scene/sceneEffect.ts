import type { FloorType } from "../../../../sim/floor/Floor"
import { AmbientEffect } from "../AmbientEffect"
import type { AmbientCategory } from "../AmbientEffect"
import type { Scene } from "./Scene"

/**
 * The seconds to wait before another play of a scene when nothing says otherwise. A backdrop comes back at
 * once, so a floor that has only one is never bare.
 */
const SPACINGS: Readonly<Record<AmbientCategory, number>> = {
    backdrop: 0, signature: 8, traffic: 20, weather: 20, surprise: 20, unit: 10,
}

/** What makes an effect of a scene. */
export interface SceneSpec {
    readonly id: string
    readonly category: AmbientCategory
    readonly scene: Scene

    /** How likely it is, relative to the other playable ones. */
    readonly weight: number

    /** The floors it plays on, any by default. */
    readonly floors?: readonly FloorType[]

    /** Does it need the open air: weather, a sky? */
    readonly outdoors?: boolean

    /** Seconds to wait after its end before another of it, those of its category by default. */
    readonly spacing?: number
}

/** The effect of a scene, on its floors and where the map holds what it needs. */
export function sceneEffect(spec: SceneSpec): AmbientEffect {
    const { scene, floors } = spec
    return new AmbientEffect({
        id: spec.id,
        category: spec.category,
        spacing: spec.spacing ?? SPACINGS[spec.category],
        stackable: false,
        isPlayable: context => {
            if(floors && !floors.includes(context.floor())) return false
            if(spec.outdoors && !context.outdoors()) return false
            return scene.playable(context)
        },
        weight: () => spec.weight,
        effect: scene,
    })
}

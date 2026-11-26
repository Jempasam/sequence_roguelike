import type { FloorType } from "../../../../sim/floor/Floor"
import { AmbientEffect } from "../AmbientEffect"
import type { Scene } from "./Scene"

/** The seconds to wait before another play of a scene when nothing says otherwise. */
const SPACING = 20

/** What makes an effect of a scene. */
export interface SceneSpec {
    readonly id: string
    readonly scene: Scene

    /** How likely it is, relative to the other playable ones. */
    readonly weight: number

    /** The floors it plays on, any by default. */
    readonly floors?: readonly FloorType[]

    /** Seconds to wait after its end before another of it. */
    readonly spacing?: number
}

/** The effect of a scene, on its floors and where the map holds what it needs. */
export function sceneEffect(spec: SceneSpec): AmbientEffect {
    const { scene, floors } = spec
    return new AmbientEffect({
        id: spec.id,
        spacing: spec.spacing ?? SPACING,
        stackable: false,
        isPlayable: context => {
            if(floors && !floors.includes(context.floor())) return false
            return scene.playable(context)
        },
        weight: () => spec.weight,
        effect: scene,
    })
}

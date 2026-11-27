import { together } from "../../../../../../../engine/animation"
import type { Scene } from "../Scene"

/** Several scenes played at once as one, over when all are: none starts unless all can. */
export function layered(...scenes: readonly Scene[]): Scene {
    return {
        playable: context => scenes.every(scene => scene.playable(context)),
        create(context){
            const made = scenes.map(scene => scene.create(context))
            if(made.includes(null)) return null
            return together(made.filter(animation => animation !== null))
        },
    }
}

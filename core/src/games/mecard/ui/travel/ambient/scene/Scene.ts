import type { Effect } from "../../../../../../engine/animation"
import type { AmbientContext } from "../AmbientContext"

/** What an ambient effect shows of particles and small beings: the counterpart of a trip. */
export interface Scene extends Effect<AmbientContext> {
    /** Whether the map holds what the scene needs. */
    playable(context: AmbientContext): boolean
}

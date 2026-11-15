import { visual } from "../../sim/base/Visual"
import type { Visual } from "../../sim/base/Visual"
import { shippedTransitions } from "../look/visualPath"

/**
 * The transitions the game ships, each once, by the name of its file: `door` for `…/door.ora`.
 *
 * @remarks
 * A function, not a value, for it is asked once the assets are indexed, which a command may come first to.
 */
export function placeTransitions(): ReadonlyMap<string, Visual> {
    return new Map(shippedTransitions().map(key => [key.slice("transitions/".length), visual(key)]))
}

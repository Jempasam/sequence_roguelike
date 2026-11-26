import type { AmbientContext } from "./AmbientContext"

/** The fights of the map whose token is shown, with where it lies and whether the party won it. */
export function fightsOf(context: AmbientContext) {
    return context.places().flatMap(({ place, position, visited }) => {
        return place.fight ? [{ place, type: place.fight, position, visited }] : []
    })
}

/** The halts of the map whose token is shown, with where it lies. */
export function haltsOf(context: AmbientContext) {
    return context.places().flatMap(({ place, position }) => {
        return place.halt ? [{ place, type: place.halt, position }] : []
    })
}

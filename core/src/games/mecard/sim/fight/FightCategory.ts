import type { Semantic } from "../../../../semantic"
import type { PlaceType } from "../run/PlaceType"

/**
 * A sort of fight, one value for each: what the map tells of it before it is fought. The fights themselves
 * are {@link FightType}s, each of a category, and share what the category says.
 *
 * @remarks
 * Its pictures are visuals, keys that nothing here resolves: only an interface loads them, so the simulation
 * runs without any. What a won fight gives is not its own: the halt laid after it on the place says so.
 * It can be named in a text: it tells its name, and an interface may draw it as it wishes.
 */
export interface FightCategory extends PlaceType, Semantic {
    /** Its name, for the console. */
    toString(): string
}

/** A category of fight, made from all of it but how it tells itself. */
export function fightCategory(spec: Omit<FightCategory, "toString"|"toSemString">): FightCategory {
    return {
        ...spec,
        toString: () => spec.name,
        toSemString: () => spec.name,
    }
}

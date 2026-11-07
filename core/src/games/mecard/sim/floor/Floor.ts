import type { ImagePath } from "../../../../engine/assets"
import type { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"
import type { SceneLook } from "../halt/SceneLook"
import type { HaltType } from "../halt/HaltType"
import type { Place, PlaceInfo, Spot } from "../run/Journey"
import type { FightType } from "../run/PlaceType"

/** A picture lying on the map of a floor, for the look of it. */
export interface Decoration {
    readonly picture: ImagePath

    /** How many virtual pixels a pixel of its picture takes, a whole number. */
    readonly size: number
}

/**
 * A sort of floor, one value for each: what the players are told of it, how it looks, and how a floor of the
 * sort is made. The sorts are the nodes of `FLOOR_LINKS`, which tells where each one leads.
 *
 * @remarks
 * Its pictures are paths, which nothing here reads: only an interface loads them, so the simulation runs
 * without any.
 */
export interface FloorType extends PlaceInfo {
    /** The picture of the exits leading to it, on the map. */
    readonly icon: ImagePath

    /** How the journey looks on its map: its background and its frame. */
    readonly look: SceneLook

    /** What may lie on its map, between the places. */
    readonly decorations: readonly Decoration[]

    /** Make a floor of this sort, the higher the level the harder. */
    create(level: number): Floor
}

/** All a floor may do while it fills its map: its way in and its exits are not its own. */
export interface FloorContext {
    /** The random numbers the map is drawn from. */
    readonly rng: Rng

    /** Lay a fight on the map, with its monsters. */
    addFight(type: FightType, monsters: readonly Monster[], at: Spot): Place

    /** Lay a halt on the map. */
    addHalt(type: HaltType, at: Spot): Place

    /** Make a place lead to another. */
    link(from: Place, to: Place): void
}

/** A floor the party goes through: it fills its map with its places, and the monsters living there. */
export interface Floor {
    readonly type: FloorType

    /** How hard it is, from 1, one more at each floor gone through. */
    readonly level: number

    /** Lay the places of its map, and the links between them. */
    fillMap(ctx: FloorContext): void
}

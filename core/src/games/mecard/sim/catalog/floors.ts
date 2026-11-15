import type { Floor, FloorType } from "../floor/Floor"
import { CAVE_FLOOR } from "../floor/subs/CaveFloor"
import { FOREST_FLOOR } from "../floor/subs/ForestFloor"
import { HELL_FLOOR } from "../floor/subs/HellFloor"
import { MINE_FLOOR } from "../floor/subs/MineFloor"
import { CASTLE_FLOOR } from "../floor/subs/CastleFloor"
import { DOJO_FLOOR } from "../floor/subs/DojoFloor"
import { FACTORY_FLOOR } from "../floor/subs/FactoryFloor"
import { GRAVEYARD_FLOOR } from "../floor/subs/GraveyardFloor"
import { HARBOR_FLOOR } from "../floor/subs/HarborFloor"
import { SWAMP_FLOOR } from "../floor/subs/SwampFloor"
import { TUNDRA_FLOOR } from "../floor/subs/TundraFloor"
import { VOLCANO_FLOOR } from "../floor/subs/VolcanoFloor"

/** The sort of floor every run starts on. */
export const FIRST_FLOOR: FloorType = CAVE_FLOOR

/**
 * The sorts of floor the exits of each sort lead to, a choice when there are several. Hell leads back to the
 * cave, so a run goes on until the party falls, each floor a level harder.
 *
 * @remarks
 * Going through a same class twice in a row takes two sorts of it, each its own node.
 */
export const FLOOR_LINKS: ReadonlyMap<FloorType, readonly FloorType[]> = new Map([
    [CAVE_FLOOR, [FOREST_FLOOR, MINE_FLOOR]],
    [FOREST_FLOOR, [HELL_FLOOR, TUNDRA_FLOOR, SWAMP_FLOOR]],
    [MINE_FLOOR, [HELL_FLOOR, FACTORY_FLOOR, VOLCANO_FLOOR]],
    [SWAMP_FLOOR, [GRAVEYARD_FLOOR, HARBOR_FLOOR]],
    [TUNDRA_FLOOR, [CASTLE_FLOOR, DOJO_FLOOR]],
    [CASTLE_FLOOR, [DOJO_FLOOR, HELL_FLOOR]],
    [GRAVEYARD_FLOOR, [HELL_FLOOR]],
    [VOLCANO_FLOOR, [HELL_FLOOR]],
    [FACTORY_FLOOR, [HELL_FLOOR]],
    [HARBOR_FLOOR, [HELL_FLOOR]],
    [DOJO_FLOOR, [HELL_FLOOR]],
    [HELL_FLOOR, [CAVE_FLOOR]],
])

/** Every sort of floor. */
export const ALL_FLOORS: readonly FloorType[] = [...FLOOR_LINKS.keys()]

/** The floors the exits of a floor lead to, a level harder. */
export function exitsOf(floor: Floor): Floor[] {
    return (FLOOR_LINKS.get(floor.type) ?? []).map(type => type.create(floor.level + 1))
}

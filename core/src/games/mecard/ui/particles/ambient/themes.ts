import type { FloorType } from "../../../sim/floor/Floor"
import type { HaltType } from "../../../sim/halt/HaltType"
import {
    CASTLE_FLOOR, CAVE_FLOOR, DOJO_FLOOR, FACTORY_FLOOR, FOREST_FLOOR, GRAVEYARD_FLOOR, HELL_FLOOR,
    MINE_FLOOR, SWAMP_FLOOR, VOLCANO_FLOOR,
    DARK_TAVERN_HALT, GREAT_HOSPITAL_HALT, GREAT_MERCHANT_HALT, GREAT_SHOP_HALT, HOSPITAL_HALT, MERCHANT_HALT,
    SHOP_HALT, TAVERN_HALT,
} from "../../../sim"

/** Floors where bats fly. */
export const BAT_FLOORS: readonly FloorType[] = [CAVE_FLOOR, GRAVEYARD_FLOOR, CASTLE_FLOOR]

/** Floors with trees. */
export const LEAF_FLOORS: readonly FloorType[] = [FOREST_FLOOR]

/** Floors where something burns. */
export const EMBER_FLOORS: readonly FloorType[] = [HELL_FLOOR, VOLCANO_FLOOR, FACTORY_FLOOR, MINE_FLOOR]

/** Floors with fog. */
export const FOG_FLOORS: readonly FloorType[] = [SWAMP_FLOOR, GRAVEYARD_FLOOR]

/** Floors where lava runs. */
export const LAVA_FLOORS: readonly FloorType[] = [HELL_FLOOR, VOLCANO_FLOOR]

/** Floors where things blow up. */
export const BLAST_FLOORS: readonly FloorType[] = [FACTORY_FLOOR, MINE_FLOOR, VOLCANO_FLOOR, HELL_FLOOR]

/** Floors where storms break. */
export const STORM_FLOORS: readonly FloorType[] = [SWAMP_FLOOR, GRAVEYARD_FLOOR, CASTLE_FLOOR]

/** Floors with cherry trees. */
export const PETAL_FLOORS: readonly FloorType[] = [DOJO_FLOOR]

/** Floors with mine carts. */
export const MINE_FLOORS: readonly FloorType[] = [MINE_FLOOR]

/** Halts where the party rests. */
export const REST_HALTS: readonly HaltType[] = [
    TAVERN_HALT, HOSPITAL_HALT, GREAT_HOSPITAL_HALT, DARK_TAVERN_HALT,
]

/** Halts that sell. */
export const SHOP_HALTS: readonly HaltType[] = [
    SHOP_HALT, MERCHANT_HALT, GREAT_SHOP_HALT, GREAT_MERCHANT_HALT,
]

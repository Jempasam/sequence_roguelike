import type { FloorType } from "../../../sim/floor/Floor"
import type { HaltType } from "../../../sim/halt/HaltType"
import {
    CASTLE_FLOOR, CAVE_FLOOR, DOJO_FLOOR, FACTORY_FLOOR, FOREST_FLOOR, GRAVEYARD_FLOOR, HARBOR_FLOOR,
    HELL_FLOOR, MINE_FLOOR, SWAMP_FLOOR, TUNDRA_FLOOR, VOLCANO_FLOOR,
    ALCHEMIST_HALT, ANTIQUARIAN_HALT, CHEST_HALT, DARK_DEMON_HALT, DARK_MAD_DOCTOR_HALT, DARK_MAGICIAN_HALT,
    DARK_STRATEGIST_HALT, DARK_TAVERN_HALT, DARK_TRAINER_HALT, GREAT_CHEST_HALT, GREAT_HOSPITAL_HALT,
    GREAT_MERCHANT_HALT, GREAT_SHOP_HALT, GREAT_WITCH_HALT, HOSPITAL_HALT, MASTER_CHEST_HALT, MERCHANT_HALT,
    MONSTER_MAGE_HALT, MONSTER_MECHANIC_HALT, MONSTER_PARK_HALT, MONSTER_SHAMAN_HALT, NECRO_CHEST_HALT,
    NECRO_RECRUIT_HALT, SHOP_HALT, TAVERN_HALT, WEAVER_HALT, WITCH_HALT,
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

/** Floors deep underground, where water drips from the vault. */
export const CAVE_FLOORS: readonly FloorType[] = [CAVE_FLOOR]

/** Floors dug in the rock, where stones and dust fall. */
export const ROCK_FLOORS: readonly FloorType[] = [CAVE_FLOOR, MINE_FLOOR]

/** Floors under the snow. */
export const SNOW_FLOORS: readonly FloorType[] = [TUNDRA_FLOOR]

/** Floors where it rains. */
export const RAIN_FLOORS: readonly FloorType[] = [SWAMP_FLOOR, CASTLE_FLOOR, HARBOR_FLOOR]

/** Floors where ash falls. */
export const ASH_FLOORS: readonly FloorType[] = [HELL_FLOOR, VOLCANO_FLOOR]

/** Floors with volcanoes. */
export const VOLCANO_FLOORS: readonly FloorType[] = [VOLCANO_FLOOR]

/** Floors of hell. */
export const HELL_FLOORS: readonly FloorType[] = [HELL_FLOOR]

/** Floors with stagnant water. */
export const MARSH_FLOORS: readonly FloorType[] = [SWAMP_FLOOR]

/** Floors with deep woods. */
export const WOOD_FLOORS: readonly FloorType[] = [FOREST_FLOOR]

/** Floors where lanterns are let go. */
export const LANTERN_FLOORS: readonly FloorType[] = [DOJO_FLOOR]

/** Floors with factories and their chimneys. */
export const FACTORY_FLOORS: readonly FloorType[] = [FACTORY_FLOOR]

/** Floors where steam escapes from the ground or the pipes. */
export const STEAM_FLOORS: readonly FloorType[] = [FACTORY_FLOOR, VOLCANO_FLOOR]

/** Floors with butterflies. */
export const BUTTERFLY_FLOORS: readonly FloorType[] = [FOREST_FLOOR, DOJO_FLOOR]

/** Floors where things rot: flies and will-o'-the-wisps. */
export const ROT_FLOORS: readonly FloorType[] = [SWAMP_FLOOR, GRAVEYARD_FLOOR]

/** Floors with graves. */
export const GRAVE_FLOORS: readonly FloorType[] = [GRAVEYARD_FLOOR]

/** Floors where crows gather. */
export const CROW_FLOORS: readonly FloorType[] = [GRAVEYARD_FLOOR, CASTLE_FLOOR]

/** Floors where clouds of bats fly. */
export const BAT_CLOUD_FLOORS: readonly FloorType[] = [CAVE_FLOOR, CASTLE_FLOOR]

/** Halts where the party rests. */
export const REST_HALTS: readonly HaltType[] = [
    TAVERN_HALT, HOSPITAL_HALT, GREAT_HOSPITAL_HALT, DARK_TAVERN_HALT,
]

/** Floors by the sea, where boats sail. */
export const HARBOR_FLOORS: readonly FloorType[] = [HARBOR_FLOOR]

/** Halts a cart goes to and from: the ones that sell and the ones that deal in goods. */
export const CART_HALTS: readonly HaltType[] = [
    WEAVER_HALT, ANTIQUARIAN_HALT, SHOP_HALT, MERCHANT_HALT, GREAT_SHOP_HALT, GREAT_MERCHANT_HALT, TAVERN_HALT,
]

/** Halts that work with monsters or take them in: the monsters of the map come and go from them too. */
export const MONSTER_HALTS: readonly HaltType[] = [
    DARK_DEMON_HALT, DARK_MAD_DOCTOR_HALT, DARK_MAGICIAN_HALT, DARK_STRATEGIST_HALT, DARK_TAVERN_HALT,
    DARK_TRAINER_HALT, MONSTER_MAGE_HALT, MONSTER_MECHANIC_HALT, MONSTER_PARK_HALT, MONSTER_SHAMAN_HALT,
    NECRO_RECRUIT_HALT,
]

/** Halts that give an item: it is tossed out of them. */
export const ITEM_HALTS: readonly HaltType[] = [
    CHEST_HALT, GREAT_CHEST_HALT, MASTER_CHEST_HALT, NECRO_CHEST_HALT,
]

/** Halts that give something to use: it is tossed out of them. */
export const USABLE_HALTS: readonly HaltType[] = [ALCHEMIST_HALT, WITCH_HALT, GREAT_WITCH_HALT]

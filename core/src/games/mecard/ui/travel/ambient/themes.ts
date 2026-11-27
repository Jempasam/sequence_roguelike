import type { FloorType } from "../../../sim/floor/Floor"
import type { HaltType } from "../../../sim/halt/HaltType"
import { CASTLE_FLOOR } from "../../../sim/floor/subs/CastleFloor"
import { CAVE_FLOOR } from "../../../sim/floor/subs/CaveFloor"
import { DOJO_FLOOR } from "../../../sim/floor/subs/DojoFloor"
import { FACTORY_FLOOR } from "../../../sim/floor/subs/FactoryFloor"
import { FOREST_FLOOR } from "../../../sim/floor/subs/ForestFloor"
import { GRAVEYARD_FLOOR } from "../../../sim/floor/subs/GraveyardFloor"
import { HARBOR_FLOOR } from "../../../sim/floor/subs/HarborFloor"
import { HELL_FLOOR } from "../../../sim/floor/subs/HellFloor"
import { MINE_FLOOR } from "../../../sim/floor/subs/MineFloor"
import { SWAMP_FLOOR } from "../../../sim/floor/subs/SwampFloor"
import { TUNDRA_FLOOR } from "../../../sim/floor/subs/TundraFloor"
import { VOLCANO_FLOOR } from "../../../sim/floor/subs/VolcanoFloor"
import { DARK_DEMON_HALT } from "../../../sim/halt/subs/dark/DarkDemonHalt"
import { DARK_MAD_DOCTOR_HALT } from "../../../sim/halt/subs/dark/DarkMadDoctorHalt"
import { DARK_MAGICIAN_HALT } from "../../../sim/halt/subs/dark/DarkMagicianHalt"
import { DARK_STRATEGIST_HALT } from "../../../sim/halt/subs/dark/DarkStrategistHalt"
import { DARK_TAVERN_HALT } from "../../../sim/halt/subs/dark/DarkTavernHalt"
import { DARK_TRAINER_HALT } from "../../../sim/halt/subs/dark/DarkTrainerHalt"
import { NECRO_CHEST_HALT } from "../../../sim/halt/subs/dark/NecroChestHalt"
import { ALCHEMIST_HALT } from "../../../sim/halt/subs/deck/AlchemistHalt"
import { ANTIQUARIAN_HALT } from "../../../sim/halt/subs/deck/AntiquarianHalt"
import { WEAVER_HALT } from "../../../sim/halt/subs/deck/WeaverHalt"
import { CHEST_HALT } from "../../../sim/halt/subs/gift/ChestHalt"
import { MERCHANT_HALT } from "../../../sim/halt/subs/gift/MerchantHalt"
import { MONSTER_PARK_HALT } from "../../../sim/halt/subs/gift/MonsterParkHalt"
import { SHOP_HALT } from "../../../sim/halt/subs/gift/ShopHalt"
import { TAVERN_HALT } from "../../../sim/halt/subs/gift/TavernHalt"
import { WITCH_HALT } from "../../../sim/halt/subs/gift/WitchHalt"
import { GREAT_CHEST_HALT } from "../../../sim/halt/subs/great/GreatChestHalt"
import { GREAT_HOSPITAL_HALT } from "../../../sim/halt/subs/great/GreatHospitalHalt"
import { GREAT_MERCHANT_HALT } from "../../../sim/halt/subs/great/GreatMerchantHalt"
import { GREAT_SHOP_HALT } from "../../../sim/halt/subs/great/GreatShopHalt"
import { GREAT_WITCH_HALT } from "../../../sim/halt/subs/great/GreatWitchHalt"
import { MASTER_CHEST_HALT } from "../../../sim/halt/subs/master/MasterChestHalt"
import { MONSTER_MAGE_HALT } from "../../../sim/halt/subs/monster/MonsterMageHalt"
import { MONSTER_MECHANIC_HALT } from "../../../sim/halt/subs/monster/MonsterMechanicHalt"
import { MONSTER_SHAMAN_HALT } from "../../../sim/halt/subs/monster/MonsterShamanHalt"
import { NECRO_RECRUIT_HALT } from "../../../sim/halt/subs/necro/NecroRecruitHalt"
import { HOSPITAL_HALT } from "../../../sim/halt/subs/party/HospitalHalt"

/**
 * The floors under a roof or under the ground, with no sky. A sort of floor with the same look as one of
 * them, such as a workshop dug like a cave, is one too.
 */
export const INDOOR_FLOORS: readonly FloorType[] = [CAVE_FLOOR, MINE_FLOOR]

/** Is a sort of floor indoors, see {@link INDOOR_FLOORS}? */
export function isIndoors(floor: FloorType): boolean {
    return INDOOR_FLOORS.some(each => each.look === floor.look)
}

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

/** Floors where fireflies shine. */
export const FIREFLY_FLOORS: readonly FloorType[] = [FOREST_FLOOR, SWAMP_FLOOR]

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

/** Floors where hail falls. */
export const HAIL_FLOORS: readonly FloorType[] = [SWAMP_FLOOR, HARBOR_FLOOR, TUNDRA_FLOOR]

/** Floors under northern lights. */
export const AURORA_FLOORS: readonly FloorType[] = [TUNDRA_FLOOR, HARBOR_FLOOR]

/** Floors where fireworks are set off. */
export const FIREWORK_FLOORS: readonly FloorType[] = [CASTLE_FLOOR, FACTORY_FLOOR, DOJO_FLOOR]

/** Floors a whale flies over. */
export const WHALE_FLOORS: readonly FloorType[] = [HARBOR_FLOOR, SWAMP_FLOOR, TUNDRA_FLOOR]

/** Floors a dragon casts its shadow on. */
export const DRAGON_FLOORS: readonly FloorType[] = [
    DOJO_FLOOR, CASTLE_FLOOR, CAVE_FLOOR, VOLCANO_FLOOR, FOREST_FLOOR, HELL_FLOOR,
]

/** Floors where witches fly. */
export const WITCH_FLOORS: readonly FloorType[] = [CASTLE_FLOOR, SWAMP_FLOOR, FOREST_FLOOR]

/** Halts where the party rests. */
export const REST_HALTS: readonly HaltType[] = [
    TAVERN_HALT, HOSPITAL_HALT, GREAT_HOSPITAL_HALT, DARK_TAVERN_HALT,
]

/** Floors by the sea, where boats sail. */
export const HARBOR_FLOORS: readonly FloorType[] = [HARBOR_FLOOR]

/** Halts a cart goes to and from: the ones that sell and the ones that deal in goods. */
export const CART_HALTS: readonly HaltType[] = [
    WEAVER_HALT, ANTIQUARIAN_HALT, SHOP_HALT, MERCHANT_HALT, GREAT_SHOP_HALT, GREAT_MERCHANT_HALT,
    TAVERN_HALT,
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

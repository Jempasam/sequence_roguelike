import type { HaltType } from "../halt/HaltType"
import { ALCHEMIST_HALT } from "../halt/subs/deck/AlchemistHalt"
import { ALTAR_HALT } from "../halt/subs/deck/AltarHalt"
import { ANTIQUARIAN_HALT } from "../halt/subs/deck/AntiquarianHalt"
import { BUTCHER_HALT } from "../halt/subs/deck/ButcherHalt"
import { DEMON_HALT } from "../halt/subs/deck/DemonHalt"
import { FORGE_HALT } from "../halt/subs/deck/ForgeHalt"
import { REMOVAL_HALT } from "../halt/subs/deck/RemovalHalt"
import { STRATEGIST_HALT } from "../halt/subs/deck/StrategistHalt"
import { WEAVER_HALT } from "../halt/subs/deck/WeaverHalt"
import { ENCHANTER_HALT } from "../halt/subs/deck/EnchanterHalt"
import { EXIT_HALT } from "../halt/subs/ExitHalt"
import { CHEST_HALT } from "../halt/subs/gift/ChestHalt"
import { INVENTOR_HALT } from "../halt/subs/gift/InventorHalt"
import { MAGICIAN_HALT } from "../halt/subs/gift/MagicianHalt"
import { MERCHANT_HALT } from "../halt/subs/gift/MerchantHalt"
import { TAVERN_HALT } from "../halt/subs/gift/TavernHalt"
import { MASTER_TRAINER_HALT } from "../halt/subs/master/MasterTrainerHalt"
import { MASTER_MAGICIAN_HALT } from "../halt/subs/master/MasterMagicianHalt"
import { MASTER_INVENTOR_HALT } from "../halt/subs/master/MasterInventorHalt"
import { GREAT_FORGE_HALT } from "../halt/subs/great/GreatForgeHalt"
import { GREAT_SHOP_HALT } from "../halt/subs/great/GreatShopHalt"
import { GREAT_HOSPITAL_HALT } from "../halt/subs/great/GreatHospitalHalt"
import { GREAT_WITCH_HALT } from "../halt/subs/great/GreatWitchHalt"
import { GREAT_MERCHANT_HALT } from "../halt/subs/great/GreatMerchantHalt"
import { TRAINER_HALT } from "../halt/subs/gift/TrainerHalt"
import { WITCH_HALT } from "../halt/subs/gift/WitchHalt"
import { HOSPITAL_HALT } from "../halt/subs/party/HospitalHalt"
import { MAD_DOCTOR_HALT } from "../halt/subs/party/MadDoctorHalt"
import { NECROMANCER_HALT } from "../halt/subs/party/NecromancerHalt"
import { SHOP_HALT } from "../halt/subs/gift/ShopHalt"


/**
 * The sorts of halt that give something plain.
 *
 * @remarks
 * The lists are functions, not values: the halts reach the saves, which reach the catalog, while the
 * halts are still being read, and a value built then would hold nothing of them.
 */
export function simpleHalts(): readonly HaltType[] {
    return [
        HOSPITAL_HALT, SHOP_HALT, CHEST_HALT, REMOVAL_HALT, ALTAR_HALT, FORGE_HALT, BUTCHER_HALT,
        ENCHANTER_HALT, ALCHEMIST_HALT, MERCHANT_HALT, WITCH_HALT, INVENTOR_HALT, TAVERN_HALT, TRAINER_HALT,
        DEMON_HALT, ANTIQUARIAN_HALT, MAGICIAN_HALT, MAD_DOCTOR_HALT, WEAVER_HALT, STRATEGIST_HALT,
        NECROMANCER_HALT,
    ]
}

/**
 * The sorts of halt of a master, who gives more than the others.
 * Master halt are modifier version of other halt that merge their
 * reward with upgrades.
 * */
export function masterHalts(): readonly HaltType[] {
    return [MASTER_TRAINER_HALT, MASTER_MAGICIAN_HALT, MASTER_INVENTOR_HALT]
}

/** The sorts of halt of a great one: a simple halt, working further. */
export function greatHalts(): readonly HaltType[] {
    return [GREAT_FORGE_HALT, GREAT_SHOP_HALT, GREAT_HOSPITAL_HALT, GREAT_WITCH_HALT, GREAT_MERCHANT_HALT]
}

/** The sorts of halt a floor may lay: all but the exits, which are not its own. */
export function layableHalts(): readonly HaltType[] {
    return [...simpleHalts(), ...masterHalts(), ...greatHalts()]
}

/** Every sort of halt. */
export function allHalts(): readonly HaltType[] {
    return [...layableHalts(), EXIT_HALT]
}

/**
 * The sort of halt with an id.
 *
 * @throws {@link Error} When the catalog has none.
 */
export function haltById(id: string): HaltType {
    const type = allHalts().find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no halt "${id}".`)
    return type
}

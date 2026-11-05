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
import { ENCHANTER_HALT } from "../halt/subs/EnchanterHalt"
import { EXIT_HALT } from "../halt/subs/ExitHalt"
import { CHEST_HALT } from "../halt/subs/gift/ChestHalt"
import { INVENTOR_HALT } from "../halt/subs/gift/InventorHalt"
import { MAGICIAN_HALT } from "../halt/subs/gift/MagicianHalt"
import { MERCHANT_HALT } from "../halt/subs/gift/MerchantHalt"
import { TAVERN_HALT } from "../halt/subs/gift/TavernHalt"
import { TRAINER_HALT } from "../halt/subs/gift/TrainerHalt"
import { WITCH_HALT } from "../halt/subs/gift/WitchHalt"
import { HOSPITAL_HALT } from "../halt/subs/HospitalHalt"
import { MAD_DOCTOR_HALT } from "../halt/subs/MadDoctorHalt"
import { NECROMANCER_HALT } from "../halt/subs/NecromancerHalt"
import { SHOP_HALT } from "../halt/subs/ShopHalt"
import type { HaltKind } from "../run/Journey"

/** The sort of halt of each kind of place holding one. */
export const HALT_TYPES: Readonly<Record<HaltKind, HaltType>> = {
    hospital: HOSPITAL_HALT,
    shop: SHOP_HALT,
    chest: CHEST_HALT,
    removal: REMOVAL_HALT,
    altar: ALTAR_HALT,
    forge: FORGE_HALT,
    butcher: BUTCHER_HALT,
    enchanter: ENCHANTER_HALT,
    alchemist: ALCHEMIST_HALT,
    merchant: MERCHANT_HALT,
    witch: WITCH_HALT,
    inventor: INVENTOR_HALT,
    tavern: TAVERN_HALT,
    trainer: TRAINER_HALT,
    demon: DEMON_HALT,
    antiquarian: ANTIQUARIAN_HALT,
    magician: MAGICIAN_HALT,
    madDoctor: MAD_DOCTOR_HALT,
    weaver: WEAVER_HALT,
    strategist: STRATEGIST_HALT,
    necromancer: NECROMANCER_HALT,
    exit: EXIT_HALT,
}

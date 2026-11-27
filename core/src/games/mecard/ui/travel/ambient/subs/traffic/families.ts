import { visual } from "../../../../../sim/base/Visual"
import {
    APOTHECARY_KIT,
    BLEEDER_KIT,
    MAGE_KIT,
    MECHANIC_KIT,
    PLAGUE_DOCTOR_KIT,
    PRESTIDIGITATOR_KIT,
    SHAMAN_KIT,
    SPELLBLADE_KIT,
    SWAMP_SORCERER_KIT,
    TAMER_KIT,
} from "../../../../../sim/catalog/kits"
import { BOSS_MONSTERS, DEVIL, SKELETON_REAPER } from "../../../../../sim/catalog/monsters"
import { ALL_PETS } from "../../../../../sim/catalog/pets"
import { BOSS } from "../../../../../sim/fight/fights"
import { DARK_DEMON_HALT } from "../../../../../sim/halt/subs/dark/DarkDemonHalt"
import { DARK_MAD_DOCTOR_HALT } from "../../../../../sim/halt/subs/dark/DarkMadDoctorHalt"
import { DARK_MAGICIAN_HALT } from "../../../../../sim/halt/subs/dark/DarkMagicianHalt"
import { DARK_TRAINER_HALT } from "../../../../../sim/halt/subs/dark/DarkTrainerHalt"
import { ALCHEMIST_HALT } from "../../../../../sim/halt/subs/deck/AlchemistHalt"
import { BUTCHER_HALT } from "../../../../../sim/halt/subs/deck/ButcherHalt"
import { DEMON_HALT } from "../../../../../sim/halt/subs/deck/DemonHalt"
import { ENCHANTER_HALT } from "../../../../../sim/halt/subs/deck/EnchanterHalt"
import { INVENTOR_HALT } from "../../../../../sim/halt/subs/gift/InventorHalt"
import { MAGICIAN_HALT } from "../../../../../sim/halt/subs/gift/MagicianHalt"
import { TRAINER_HALT } from "../../../../../sim/halt/subs/gift/TrainerHalt"
import { WITCH_HALT } from "../../../../../sim/halt/subs/gift/WitchHalt"
import { GREAT_MAGICIAN_HALT } from "../../../../../sim/halt/subs/great/GreatMagicianHalt"
import { GREAT_WITCH_HALT } from "../../../../../sim/halt/subs/great/GreatWitchHalt"
import { MASTER_INVENTOR_HALT } from "../../../../../sim/halt/subs/master/MasterInventorHalt"
import { MASTER_MAGICIAN_HALT } from "../../../../../sim/halt/subs/master/MasterMagicianHalt"
import { MASTER_TRAINER_HALT } from "../../../../../sim/halt/subs/master/MasterTrainerHalt"
import { MONSTER_MAGE_HALT } from "../../../../../sim/halt/subs/monster/MonsterMageHalt"
import { MONSTER_MECHANIC_HALT } from "../../../../../sim/halt/subs/monster/MonsterMechanicHalt"
import { MONSTER_SHAMAN_HALT } from "../../../../../sim/halt/subs/monster/MonsterShamanHalt"
import { NECRO_RECRUIT_HALT } from "../../../../../sim/halt/subs/necro/NecroRecruitHalt"
import { MAD_DOCTOR_HALT } from "../../../../../sim/halt/subs/party/MadDoctorHalt"
import { NECROMANCER_HALT } from "../../../../../sim/halt/subs/party/NecromancerHalt"
import type { Kit } from "../../../../../sim/catalog/kits"
import type { AmbientEffect } from "../../AmbientEffect"
import { CART_HALTS, MONSTER_HALTS } from "../../themes"
import { byHalt, enemyOfMap, firstLoaded, fixed, manyOf, party, randomOf } from "../../trip/Cast"
import type { Cast } from "../../trip/Cast"
import { enter, leave, stroll, swap } from "../../trip/Itinerary"
import type { Itinerary } from "../../trip/Itinerary"
import { either, fightsWhere, haltsAmong } from "../../trip/places"
import type { Places } from "../../trip/places"
import { CART, COMPANY, WALKER } from "../../trip/Traveler"
import type { Traveler } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** The robots a mechanic goes about with. */
const ROBOTS = [visual("units/robot"), visual("units/robot2"), visual("units/kamikaze_robot")]

/** The sprite of the cart, the picture of the mine standing in until its own is drawn. */
const WAGON = [visual("units/wagon"), visual("floors/mine/cart")]

/** One person, drawn from its kit. */
const kit = (each: Kit): Cast => fixed(each.sprite)

/** What a family is: the places its trips go from and to, who makes them, and how likely they are. */
export interface Family {
    /** What names its effects: `stroll-<name>`, `leave-<name>`, `enter-<name>` and `swap-<name>`. */
    readonly name: string

    readonly places: Places
    readonly cast: Cast
    readonly traveler: Traveler

    /** How likely a trip of the family is, whichever of its itineraries it goes by. */
    readonly weight: number

    /** The itineraries it goes by, all four by default. */
    readonly only?: readonly (keyof typeof ITINERARIES)[]
}

/** The four itineraries of a family, by the name that starts its effects. */
const ITINERARIES = {
    stroll: (places: Places): Itinerary => stroll(places),
    leave: (places: Places): Itinerary => leave(places),
    enter: (places: Places): Itinerary => enter(places),
    swap: (places: Places): Itinerary => swap(places),
}

/**
 * The effects of a family: one for each itinerary. The weight of the family is shared between the itineraries
 * the map allows, so a family does not weigh more for having more ways to go.
 */
export function familyEffects(family: Family): AmbientEffect[] {
    const names = family.only ?? (Object.keys(ITINERARIES) as (keyof typeof ITINERARIES)[])
    const itineraries = names.map(name => ({ name, itinerary: ITINERARIES[name](family.places) }))
    return itineraries.map(({ name, itinerary }) => tripEffect({
        id: `${name}-${family.name}`,
        category: "traffic",
        itinerary,
        cast: family.cast,
        traveler: family.traveler,
        spacing: 20,
        weight: context => {
            const open = itineraries.filter(each => each.itinerary.playable(context)).length
            return family.weight / Math.max(1, open)
        },
    }))
}

/** The monsters and the kits of the fights of the map, and the halts that work with monsters. */
export const ENEMY_PLACES: Places = either(fightsWhere(), haltsAmong(MONSTER_HALTS))

/** The families of the halts and the fights: who walks out of which halt. */
export const FAMILIES: readonly Family[] = [
    {
        name: "alchemist", places: haltsAmong([ALCHEMIST_HALT]), cast: kit(APOTHECARY_KIT), traveler: WALKER,
        weight: 3,
    },
    {
        name: "boss", places: fightsWhere(fight => fight.category === BOSS),
        cast: manyOf(BOSS_MONSTERS.map(each => each.sprite), 1), traveler: WALKER, weight: 3,
        only: ["stroll", "leave"],
    },
    {
        name: "butcher", places: haltsAmong([BUTCHER_HALT]), cast: kit(BLEEDER_KIT), traveler: WALKER, weight: 3,
    },
    {
        name: "cart", places: haltsAmong(CART_HALTS),
        cast: party(fixed(visual("units/horse")), firstLoaded(...WAGON)), traveler: CART, weight: 6,
    },
    {
        name: "devil", places: haltsAmong([DEMON_HALT, DARK_DEMON_HALT]), cast: fixed(DEVIL.sprite),
        traveler: WALKER, weight: 3,
    },
    { name: "enemy", places: ENEMY_PLACES, cast: enemyOfMap, traveler: WALKER, weight: 6 },
    {
        name: "mad-doctor", places: haltsAmong([MAD_DOCTOR_HALT, DARK_MAD_DOCTOR_HALT]),
        cast: kit(PLAGUE_DOCTOR_KIT), traveler: WALKER, weight: 3,
    },
    {
        name: "mage", places: haltsAmong([MONSTER_MAGE_HALT, ENCHANTER_HALT]),
        cast: byHalt(new Map([
            [MONSTER_MAGE_HALT, kit(MAGE_KIT)],
            [ENCHANTER_HALT, randomOf(kit(SPELLBLADE_KIT), kit(MAGE_KIT))],
        ])),
        traveler: WALKER, weight: 3,
    },
    {
        name: "magician",
        places: haltsAmong([MAGICIAN_HALT, GREAT_MAGICIAN_HALT, MASTER_MAGICIAN_HALT, DARK_MAGICIAN_HALT]),
        cast: kit(PRESTIDIGITATOR_KIT), traveler: WALKER, weight: 3,
    },
    {
        name: "mechanic",
        places: haltsAmong([MONSTER_MECHANIC_HALT, INVENTOR_HALT, MASTER_INVENTOR_HALT]),
        cast: party(kit(MECHANIC_KIT), manyOf(ROBOTS, 1, 3)), traveler: COMPANY, weight: 3,
    },
    {
        name: "necromancer", places: haltsAmong([NECROMANCER_HALT, NECRO_RECRUIT_HALT]),
        cast: manyOf([SKELETON_REAPER.sprite], 2, 4), traveler: COMPANY, weight: 3,
    },
    {
        name: "shaman", places: haltsAmong([MONSTER_SHAMAN_HALT]), cast: kit(SHAMAN_KIT), traveler: WALKER,
        weight: 3,
    },
    {
        name: "trainer", places: haltsAmong([TRAINER_HALT, MASTER_TRAINER_HALT, DARK_TRAINER_HALT]),
        cast: party(kit(TAMER_KIT), manyOf(ALL_PETS.map(each => each.sprite), 1)), traveler: COMPANY,
        weight: 3,
    },
    {
        name: "witch", places: haltsAmong([WITCH_HALT, GREAT_WITCH_HALT]), cast: kit(SWAMP_SORCERER_KIT),
        traveler: WALKER, weight: 3,
    },
]

/** Every effect of the families. */
export const FAMILY_EFFECTS: readonly AmbientEffect[] = FAMILIES.flatMap(familyEffects)

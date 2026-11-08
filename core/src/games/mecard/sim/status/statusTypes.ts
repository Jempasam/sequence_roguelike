import { BURNING_GROUND } from "../hazard/subs/BurningGround"
import { MINE_HAZARD } from "../hazard/subs/Mine"
import { PUDDLE_HAZARD } from "../hazard/subs/Puddle"
import { ROCKY } from "../hazard/subs/Rocky"
import { SURGING } from "../hazard/subs/Surging"
import { WHIRLING } from "../hazard/subs/Whirling"

import type { StatusType } from "./Status"
import { BLOODLUST } from "./subs/Bloodlust"
import { BURN } from "./subs/Burn"
import { CONCENTRATED, FURIOUS } from "./subs/Calm"
import { COATED } from "./subs/Coated"
import { CONFUSED } from "./subs/Confusion"
import { DEMONIC } from "./subs/DemonEnergy"
import { COUNTER, DISARM, DODGE, SLIDING_PARRY, WOODEN_SHIELD } from "./subs/Dodge"
import { FLEETING } from "./subs/Fleeting"
import { FRENZIED } from "./subs/Frenzy"
import { GRAND_RITUAL } from "./subs/GrandRitual"
import { HEALING } from "./subs/Healing"
import { POISONED } from "./subs/Poison"
import { POSSESSED } from "./subs/Possessed"
import { ENRAGED } from "./subs/Rage"
import { ROOTED } from "./subs/Rooted"
import { SLOWED } from "./subs/Slowness"
import { SPLASHING } from "./subs/Splashing"
import { VULNERABLE } from "./subs/Vulnerability"
import { WEAKENED } from "./subs/Weakness"
import { BLEEDING, FRAGILE, MARKED, SOUL_LINKED, SOUL_SHIELDED } from "./subs/Wounds"

/**
 * Every kind of status a status is made of, each one alone in its kind: the good ones first, then the neutral
 * ones, then the bad ones, then what a body lying on the ground holds.
 */
export const STATUS_TYPES: readonly StatusType[] = [
    BLOODLUST, CONCENTRATED, COUNTER, DEMONIC, DISARM, DODGE, FURIOUS, SLIDING_PARRY, WOODEN_SHIELD, HEALING, SOUL_SHIELDED,
    ENRAGED, FLEETING, FRENZIED, POSSESSED, SOUL_LINKED,
    BLEEDING, BURN, CONFUSED, FRAGILE, MARKED, POISONED, ROOTED, SLOWED, VULNERABLE, WEAKENED,
    MINE_HAZARD,
]

/**
 * The kinds of status with variants, a dose or an element each: what each variant is a
 * {@link StatusType.family} of, and what a screen names a kind of them by.
 */
export const STATUS_FAMILIES: readonly StatusType[] = [
    COATED, GRAND_RITUAL, SPLASHING, BURNING_GROUND, PUDDLE_HAZARD, ROCKY, SURGING, WHIRLING,
]

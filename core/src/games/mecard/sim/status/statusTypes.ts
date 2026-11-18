import { BEAR_TRAP_HAZARD } from "../hazard/subs/BearTrap"
import { BURNING_GROUND } from "../hazard/subs/BurningGround"
import { MINE_HAZARD } from "../hazard/subs/Mine"
import { PUDDLE_HAZARD } from "../hazard/subs/Puddle"
import { ROCKY } from "../hazard/subs/Rocky"
import { SURGING } from "../hazard/subs/Surging"
import { WHIRLING } from "../hazard/subs/Whirling"

import type { StatusType } from "./Status"
import { BLOODLUST } from "./subs/Bloodlust"
import { BURN } from "./subs/Burn"
import { BISHOP_PIECE, CHESS_PIECE, KNIGHT_PIECE, PAWN_PIECE, QUEEN_PIECE, ROOK_PIECE } from "./subs/ChessPieces"
import { CONCENTRATED, FURIOUS } from "./subs/Calm"
import { COATED } from "./subs/Coated"
import { BUBBLE, GIANT, SOAPY } from "./subs/BubbleStatuses"
import { ELEMENT_COATING } from "./subs/ElementCoating"
import { POTION_COATING } from "./subs/PotionCoating"
import { CONFUSED } from "./subs/Confusion"
import { DEMONIC } from "./subs/DemonEnergy"
import { COUNTER, DISARM, DODGE, SLIDING_PARRY, WOODEN_SHIELD } from "./subs/Dodge"
import { EXPLOSIVE } from "./subs/Explosive"
import { FLEETING } from "./subs/Fleeting"
import { FRENZIED } from "./subs/Frenzy"
import { HEALING } from "./subs/Healing"
import { MOMENTUM } from "./subs/Momentum"
import { OVERHEATED } from "./subs/Overheat"
import { POISONED } from "./subs/Poison"
import { POSSESSED } from "./subs/Possessed"
import { ENRAGED } from "./subs/Rage"
import { RESURRECTED } from "./subs/Resurrection"
import { RITUAL_STATUS } from "./subs/RitualStatus"
import { ROOTED } from "./subs/Rooted"
import { SLOWED } from "./subs/Slowness"
import { SOAKED } from "./subs/Soaked"
import { SPLASHING } from "./subs/Splashing"
import { STINKING } from "./subs/Stench"
import { SWALLOWED } from "./subs/Swallow"
import { SWIFT } from "./subs/Swiftness"
import { VIGOROUS } from "./subs/Vigor"
import { VULNERABLE } from "./subs/Vulnerability"
import { WEAKENED } from "./subs/Weakness"
import { BLEEDING, FRAGILE, MARKED, SOUL_LINKED, SOUL_SHIELDED } from "./subs/Wounds"

/**
 * Every kind of status a status is made of, each one alone in its kind: the good ones first, then the neutral
 * ones, then the bad ones, then what a body lying on the ground holds.
 */
export const STATUS_TYPES: readonly StatusType[] = [
    BLOODLUST, CONCENTRATED, COUNTER, DEMONIC, DISARM, DODGE, FURIOUS, SLIDING_PARRY, WOODEN_SHIELD, HEALING, SOUL_SHIELDED,
    SWALLOWED, SWIFT, VIGOROUS, OVERHEATED, MOMENTUM, RESURRECTED, BUBBLE, SOAPY, GIANT,
    CHESS_PIECE, PAWN_PIECE, ROOK_PIECE, KNIGHT_PIECE, BISHOP_PIECE, QUEEN_PIECE,
    ENRAGED, EXPLOSIVE, FLEETING, FRENZIED, POSSESSED, SOUL_LINKED,
    BLEEDING, BURN, CONFUSED, FRAGILE, MARKED, POISONED, ROOTED, SLOWED, STINKING, VULNERABLE, WEAKENED,
    MINE_HAZARD, BEAR_TRAP_HAZARD,
]

/**
 * The kinds of status with variants, a dose or an element each: what each variant is a
 * {@link StatusType.family} of, and what a screen names a kind of them by.
 */
export const STATUS_FAMILIES: readonly StatusType[] = [
    COATED, ELEMENT_COATING, POTION_COATING, SOAKED, RITUAL_STATUS, SPLASHING, BURNING_GROUND, PUDDLE_HAZARD, ROCKY, SURGING, WHIRLING,
]

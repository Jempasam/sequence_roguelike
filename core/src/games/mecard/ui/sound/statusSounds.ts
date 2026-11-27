import type { SoundPath } from "../../../../engine/audio"
import { BEAR_TRAP_HAZARD } from "../../sim/hazard/subs/BearTrap"
import { BURNING_GROUND } from "../../sim/hazard/subs/BurningGround"
import { MINE_HAZARD } from "../../sim/hazard/subs/Mine"
import { PUDDLE_HAZARD } from "../../sim/hazard/subs/Puddle"
import { ROCKY } from "../../sim/hazard/subs/Rocky"
import { SURGING } from "../../sim/hazard/subs/Surging"
import { WHIRLING } from "../../sim/hazard/subs/Whirling"
import type { Polarity, StatusType } from "../../sim/status/Status"
import { BLOODLUST } from "../../sim/status/subs/Bloodlust"
import { BUBBLE, GIANT, SOAPY } from "../../sim/status/subs/BubbleStatuses"
import { BURN } from "../../sim/status/subs/Burn"
import { CONCENTRATED, FURIOUS } from "../../sim/status/subs/Calm"
import { BISHOP_PIECE, CHESS_PIECE, KNIGHT_PIECE, PAWN_PIECE, QUEEN_PIECE, ROOK_PIECE } from "../../sim/status/subs/ChessPieces"
import { COATED } from "../../sim/status/subs/Coated"
import { CONFUSED } from "../../sim/status/subs/Confusion"
import { DEMONIC } from "../../sim/status/subs/DemonEnergy"
import { COUNTER, DISARM, DODGE, SLIDING_PARRY, WOODEN_SHIELD } from "../../sim/status/subs/Dodge"
import { ELEMENT_COATING } from "../../sim/status/subs/ElementCoating"
import { ENCHANTED } from "../../sim/status/subs/EnchantedBlade"
import { EXPLOSIVE } from "../../sim/status/subs/Explosive"
import { FLEETING } from "../../sim/status/subs/Fleeting"
import { FRENZIED } from "../../sim/status/subs/Frenzy"
import { HEALING } from "../../sim/status/subs/Healing"
import { LUCIDITY } from "../../sim/status/subs/Lucidity"
import { MOMENTUM } from "../../sim/status/subs/Momentum"
import { OVERHEATED } from "../../sim/status/subs/Overheat"
import { POISONED } from "../../sim/status/subs/Poison"
import { POSSESSED } from "../../sim/status/subs/Possessed"
import { POTION_COATING } from "../../sim/status/subs/PotionCoating"
import { ENRAGED } from "../../sim/status/subs/Rage"
import { RESURRECTED } from "../../sim/status/subs/Resurrection"
import { RITUAL_STATUS } from "../../sim/status/subs/RitualStatus"
import { ROOTED } from "../../sim/status/subs/Rooted"
import { SLOWED } from "../../sim/status/subs/Slowness"
import { SOAKED } from "../../sim/status/subs/Soaked"
import { SPLASHING } from "../../sim/status/subs/Splashing"
import { STINKING } from "../../sim/status/subs/Stench"
import { STUNNED } from "../../sim/status/subs/Stunned"
import { ELECTROCUTED } from "../../sim/status/subs/Electrocuted"
import { SWALLOWED } from "../../sim/status/subs/Swallow"
import { SWIFT } from "../../sim/status/subs/Swiftness"
import { VIGOROUS } from "../../sim/status/subs/Vigor"
import { VULNERABLE } from "../../sim/status/subs/Vulnerability"
import { WEAKENED } from "../../sim/status/subs/Weakness"
import { BLEEDING, FRAGILE, MARKED, SOUL_LINKED, SOUL_SHIELDED } from "../../sim/status/subs/Wounds"
import type { Cue } from "./Cue"

/** The sound of a status, among those of the folder of the statuses. */
function statusCue(id: string): Cue {
    return { path: `mecard/sounds/statuses/${id}.ogg` as SoundPath, volume: 1 }
}

/** What a status has no sound of its own to be heard by: one for each polarity. */
const FALLBACKS: Readonly<Record<Polarity, Cue>> = {
    positive: statusCue("fallback_positive"),
    negative: statusCue("fallback_negative"),
    neutral: statusCue("fallback_neutral"),
}

/** The sound of each kind of status, and of each family of variants. */
const STATUS_SOUNDS: ReadonlyMap<StatusType, Cue> = new Map([
    [BLOODLUST, statusCue("bloodlust")],
    [CONCENTRATED, statusCue("concentrated")],
    [COUNTER, statusCue("counter")],
    [DEMONIC, statusCue("demonic")],
    [DISARM, statusCue("disarm")],
    [DODGE, statusCue("dodge")],
    [FURIOUS, statusCue("furious")],
    [SLIDING_PARRY, statusCue("sliding_parry")],
    [WOODEN_SHIELD, statusCue("wooden_shield")],
    [HEALING, statusCue("healing")],
    [SOUL_SHIELDED, statusCue("soul_shielded")],
    [SWALLOWED, statusCue("swallowed")],
    [SWIFT, statusCue("swift")],
    [VIGOROUS, statusCue("vigorous")],
    [OVERHEATED, statusCue("overheated")],
    [LUCIDITY, statusCue("lucidity")],
    [MOMENTUM, statusCue("momentum")],
    [RESURRECTED, statusCue("resurrected")],
    [BUBBLE, statusCue("bubble")],
    [SOAPY, statusCue("soapy")],
    [GIANT, statusCue("giant")],
    [CHESS_PIECE, statusCue("chess_piece")],
    [PAWN_PIECE, statusCue("pawn")],
    [ROOK_PIECE, statusCue("rook")],
    [KNIGHT_PIECE, statusCue("knight")],
    [BISHOP_PIECE, statusCue("bishop")],
    [QUEEN_PIECE, statusCue("queen")],
    [ENRAGED, statusCue("enraged")],
    [EXPLOSIVE, statusCue("explosive")],
    [FLEETING, statusCue("fleeting")],
    [FRENZIED, statusCue("frenzied")],
    [POSSESSED, statusCue("possessed")],
    [SOUL_LINKED, statusCue("soul_linked")],
    [BLEEDING, statusCue("bleeding")],
    [BURN, statusCue("burn")],
    [CONFUSED, statusCue("confused")],
    [FRAGILE, statusCue("fragile")],
    [MARKED, statusCue("marked")],
    [POISONED, statusCue("poisoned")],
    [ROOTED, statusCue("rooted")],
    [SLOWED, statusCue("slowed")],
    [STINKING, statusCue("stinking")],
    [STUNNED, statusCue("stunned")],
    [ELECTROCUTED, statusCue("electrocuted")],
    [VULNERABLE, statusCue("vulnerable")],
    [WEAKENED, statusCue("weakened")],
    [MINE_HAZARD, statusCue("mine")],
    [BEAR_TRAP_HAZARD, statusCue("bear_trap")],
    [COATED, statusCue("coated")],
    [ELEMENT_COATING, statusCue("element_coating")],
    [POTION_COATING, statusCue("potion_coating")],
    [SOAKED, statusCue("soaked")],
    [RITUAL_STATUS, statusCue("ritual")],
    [SPLASHING, statusCue("splashing")],
    [BURNING_GROUND, statusCue("burning_ground")],
    [PUDDLE_HAZARD, statusCue("puddle")],
    [ROCKY, statusCue("rocky")],
    [SURGING, statusCue("surging")],
    [WHIRLING, statusCue("whirling")],
    [ENCHANTED, statusCue("enchanted")],
])

/** Every sound of the statuses, for loading them. */
export const STATUS_CUES: readonly Cue[] = [...STATUS_SOUNDS.values(), ...Object.values(FALLBACKS)]

/**
 * The sound a status is heard by, when it is added and when it acts: its own, else the one of its family,
 * else the one of its polarity.
 */
export function soundOfStatus(type: StatusType): Cue {
    return STATUS_SOUNDS.get(type) ?? STATUS_SOUNDS.get(type.family) ?? FALLBACKS[type.polarity]
}

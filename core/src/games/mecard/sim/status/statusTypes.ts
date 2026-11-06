import type { StatusType } from "./Status"
import { BLOODLUST } from "./subs/Bloodlust"
import { BURN } from "./subs/Burn"
import { COATED } from "./subs/Coated"
import { CONFUSED } from "./subs/Confusion"
import { DODGE } from "./subs/Dodge"
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

/** Every kind of status a unit can hold, the good ones first, then the neutral ones, then the bad ones. */
export const STATUS_TYPES: readonly StatusType[] = [
    BLOODLUST, COATED, DODGE, GRAND_RITUAL, HEALING,
    ENRAGED, FLEETING, FRENZIED, POSSESSED, SPLASHING,
    BURN, CONFUSED, POISONED, ROOTED, SLOWED, VULNERABLE, WEAKENED,
]

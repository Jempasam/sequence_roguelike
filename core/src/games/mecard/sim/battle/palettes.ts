import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

/** The colors of the units of the first team that count for it, in the order they enter. */
export const HERO_COLORS: readonly Rgba[] = [rgba(0.35, 0.6, 1), rgba(0.4, 0.85, 0.45), rgba(0.75, 0.5, 1)]

/** The colors of the units of the other teams that count for them, in the order they enter. */
export const MONSTER_COLORS: readonly Rgba[] = [
    rgba(0.95, 0.35, 0.3), rgba(1, 0.6, 0.25), rgba(0.85, 0.3, 0.6), rgba(0.75, 0.75, 0.3),
]

/** The colors of what is summoned, left or placed, of any team, in the order it comes. */
export const SUMMON_PALETTE: readonly Rgba[] = [
    rgba(0.8, 0.7, 0.35), rgba(0.55, 0.7, 0.75), rgba(0.65, 0.5, 0.4), rgba(0.5, 0.65, 0.45),
]

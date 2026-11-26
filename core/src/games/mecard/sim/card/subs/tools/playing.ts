import { sampled, still } from "../../../battle/effects"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Battle } from "../../../battle/Battle"

/** What an action shows at a moment. */
type Shown = readonly Indicator[]

/** How long a short effect stays shown, in seconds: a zap, a word. */
export const SHORT_TIME = 0.3

/** How long a word about an action stays, in seconds: blocked, missed, nobody there. */
export const WORD_TIME = 0.35

/** Let a number of seconds go by on the screen, nothing shown: a pause in an action. */
export function wait(battle: Battle, seconds: number): void {
    battle.post(still(seconds, []))
}

/** Show something for a number of seconds, nothing by default: a pause in an action. */
export function hold(battle: Battle, seconds: number, shown: readonly Indicator[] = []): void {
    battle.post(still(seconds, shown))
}

/**
 * Show something changing over a number of seconds: a slash sweeping, a shot flying. What it shows at each
 * moment is computed now, where the battle stands.
 *
 * @param at - What it shows once a share of the time went by, from 0 to 1.
 */
export function sweep(battle: Battle, seconds: number, at: (share: number) => Shown): void {
    battle.post(sampled(seconds, at))
}

/**
 * Show something thrown flying over a number of seconds, until it lands, its last moment showing it there: a
 * bomb, a potion.
 *
 * @param at - What it shows once a share of the flight went by, from 0 to 1.
 */
export function flight(battle: Battle, seconds: number, at: (share: number) => Shown): void {
    battle.post(sampled(seconds, at))
}

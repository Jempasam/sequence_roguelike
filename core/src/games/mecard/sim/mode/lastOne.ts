import type { GameMember } from "./GameMember"
import type { GameModeContext } from "./GameModeContext"
import type { Settle } from "./Settle"

/** How long the players read who is left, before the game ends, in ms. */
export const LAST_ONE_LINGER_MS = 5_000

/**
 * A player that is the only one left wins, and the game ends. Called from `onQuit` of the manager of a mode
 * that is played by those who stay: it is given once and for all, with the same {@link Settle} as the normal
 * end, so an end that comes at the same time does not conclude twice.
 *
 * @param isPlaying - Is this member still in the game? Those that quit are not listed by the context.
 * @param ending - What the end of the game is settled with, the id of the winner.
 * @returns The one left, none when there are several, none, or the game ended already.
 */
export function lastOne(
    ctx: GameModeContext, isPlaying: (member: GameMember) => boolean, ending: Settle<string|null>,
): GameMember|null {
    const left = ctx.members().filter(isPlaying)
    if(left.length !== 1 || !ending.settle(left[0].id)) return null
    ctx.announce(`${left[0].name} est le dernier joueur : il gagne.`)
    ctx.after(LAST_ONE_LINGER_MS, () => ctx.end())
    return left[0]
}

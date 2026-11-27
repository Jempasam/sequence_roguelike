import type { Action, UnitContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import * as Inflict from "../../../battle/mecanic/inflict"
import type { Unit } from "../../../battle/Unit"
import { isChessPiece, isPawn } from "../../../status/subs/ChessPieces"

/** What picks the units an action is handed to, among the pieces of the battle. */
export type PieceSelector = (battle: Battle, owner: Unit) => Unit[]

/** The pieces a unit can have play for it: the pieces standing for its team, the unit itself aside. */
export function piecesOf(battle: Battle, owner: Unit): Unit[] {
    return battle.units.filter(unit => unit !== owner && unit.alive && unit.team === owner.team && isChessPiece(unit))
}

/** The pieces in the order they play: the pawns first, each group in the order the units came. */
export function inPlayOrder(battle: Battle, pieces: readonly Unit[]): Unit[] {
    const position = (unit: Unit): number => battle.units.indexOf(unit)
    const sorted = [...pieces].sort((a, b) => position(a) - position(b))
    return [...sorted.filter(isPawn), ...sorted.filter(unit => !isPawn(unit))]
}

/** The piece standing nearest to a unit, as a list. */
export const NEAREST_PIECE: PieceSelector = (battle, owner) => {
    const pieces = piecesOf(battle, owner)
    const nearest = pieces.reduce<Unit|null>((best, unit) => {
        return !best || unit.position.distance(owner.position) < best.position.distance(owner.position) ? unit : best
    }, null)
    return nearest ? [nearest] : []
}

/** The piece that came last, as a list. */
export const LAST_PIECE: PieceSelector = (battle, owner) => {
    const pieces = piecesOf(battle, owner)
    const last = pieces.reduce<Unit|null>((best, unit) => {
        return !best || battle.units.indexOf(unit) > battle.units.indexOf(best) ? unit : best
    }, null)
    return last ? [last] : []
}

/** Every piece. */
export const EVERY_PIECE: PieceSelector = piecesOf

/**
 * An action played by pieces rather than by the unit that plays the card: each piece plays it where it stands, at
 * once, from its own place, the pawns first. With no piece to play it, nothing is played at all.
 */
export function playedBy(action: Action, select: PieceSelector): Action {
    const players = ({ battle, unit }: UnitContext): Unit[] => inPlayOrder(battle, select(battle, unit))
    return {
        use: ctx => {
            for(const piece of players(ctx)){
                const played: UnitContext = { battle: ctx.battle, unit: piece }
                Inflict.act(played, () => action.use(played))
            }
        },
        preview: ctx => {
            const shown = players(ctx).flatMap(piece => action.preview({
                battle: ctx.battle, unit: piece, pose: { position: piece.position, direction: piece.direction },
            }).indicators)
            // The unit itself goes nowhere: only the pieces move.
            return { indicators: shown, pose: ctx.pose }
        },
    }
}

import { Add, ModifierKey } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { BaseStatus } from "../BaseStatus"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"

/** How far a rook goes on after each of its moves, in meters: ahead, the way it went. */
export const ROOK_EXTRA = 1

/** How far a knight goes aside after each of its moves, in meters: to the right of the way it went. */
export const KNIGHT_EXTRA = 1

/** How much a bishop adds to its move: half as far again. */
export const BISHOP_MOVE = 0.5

/** The color of the pieces: a warm ivory. */
const IVORY: readonly [number, number, number] = [0.92, 0.88, 0.75]

/** The statuses of the pieces of chess, which let the units holding them be played for. */
export const PAWN_PIECE = new StatusType("pion", statusVisual("chess_piece", ...IVORY), "positive", () => new PawnPiece(), {
    description: ["Une pièce d'échecs : son invocateur peut lui faire jouer ses actions. Joue avant les autres pièces."],
    cloned: false,
})
export const ROOK_PIECE = new StatusType("tour", statusVisual("chess_piece", ...IVORY), "positive", () => new RookPiece(), {
    description: ["Une pièce d'échecs : son invocateur peut lui faire jouer ses actions. Après chaque déplacement, avance de ", ROOK_EXTRA, " m de plus."],
    cloned: false,
})
export const KNIGHT_PIECE = new StatusType("cavalier", statusVisual("chess_piece", ...IVORY), "positive", () => new KnightPiece(), {
    description: ["Une pièce d'échecs : son invocateur peut lui faire jouer ses actions. Après chaque déplacement, se décale de ", KNIGHT_EXTRA, " m à droite."],
    cloned: false,
})
export const BISHOP_PIECE = new StatusType("fou", statusVisual("chess_piece", ...IVORY), "positive", () => new BishopPiece(), {
    description: ["Une pièce d'échecs : son invocateur peut lui faire jouer ses actions. Ses déplacements vont 50 % plus loin."],
    cloned: false,
})
export const QUEEN_PIECE = new StatusType("reine", statusVisual("chess_piece", ...IVORY), "positive", () => new QueenPiece(), {
    description: ["Une pièce d'échecs : son invocateur peut lui faire jouer ses actions."],
    cloned: false,
})

/** Promoted: for a few rounds a unit is a piece for its allies, who can have it play their actions. */
export const CHESS_PIECE = new StatusType("pièce d'échecs", statusVisual("chess_piece", ...IVORY), "positive", level => new PromotedPiece(level), {
    description: ["Considéré comme une pièce d'échecs par ses alliés : ils peuvent lui faire jouer leurs actions, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."],
})

/** The statuses that make a unit a piece. */
const PIECE_TYPES: readonly StatusType[] = [PAWN_PIECE, ROOK_PIECE, KNIGHT_PIECE, BISHOP_PIECE, QUEEN_PIECE, CHESS_PIECE]

/** Is a unit a piece of chess: a summoned one, or an ally promoted? */
export function isChessPiece(unit: Unit): boolean {
    return PIECE_TYPES.some(type => unit.statuses.has(type))
}

/** Is a unit a pawn? Pawns play before the other pieces. */
export function isPawn(unit: Unit): boolean {
    return unit.statuses.has(PAWN_PIECE)
}

/** A piece set down by its owner: it stays while it lives, with a reaction of its own. */
abstract class SummonedPiece extends BaseStatus {


    constructor(){
        super(1)
    }


    public init(ctx: UnitContext): void {
        this.keep(...this.plug(ctx))
    }

    public remove(): void {
        this.letGo()
    }

    /** Plug in the reaction of the piece, none by default: a pawn, a queen. */
    protected plug(_ctx: UnitContext): Observer[] {
        return []
    }
}

/** After each move of its own, a piece goes on by a way worked out from the one it took. */
function reacting({ battle, unit }: UnitContext, aside: (way: Vector2) => Vector2, extra: number): Observer {
    let going = false
    return battle.signals.moved.add(({ unit: mover, from, to }) => {
        // What others do to it, a push, is no move of its own, and what it does back is no new move to follow.
        if(mover !== unit || unit.shoving || going) return
        const way = to.position.minus(from.position).normalized
        if(!way) return
        going = true
        try {
            battle.move(unit, aside(way), extra)
        } finally {
            going = false
        }
    })
}

class PawnPiece extends SummonedPiece {
    public readonly type: StatusType = PAWN_PIECE
}

class QueenPiece extends SummonedPiece {
    public readonly type: StatusType = QUEEN_PIECE
}

class RookPiece extends SummonedPiece {


    public readonly type: StatusType = ROOK_PIECE

    protected override plug(ctx: UnitContext): Observer[] {
        return [reacting(ctx, way => way, ROOK_EXTRA)]
    }
}

class KnightPiece extends SummonedPiece {


    public readonly type: StatusType = KNIGHT_PIECE

    protected override plug(ctx: UnitContext): Observer[] {
        return [reacting(ctx, way => way.right, KNIGHT_EXTRA)]
    }
}

class BishopPiece extends SummonedPiece {


    public readonly type: StatusType = BISHOP_PIECE

    protected override plug({ unit }: UnitContext): Observer[] {
        const key = new ModifierKey("fou")
        unit.stats.move.add(key, new Add(BISHOP_MOVE))
        return [{ remove: () => unit.stats.move.remove(key) }]
    }
}

/** An ally promoted for some rounds: nothing but being a piece for the units that play for it. */
class PromotedPiece extends RoundStatus {


    public readonly type: StatusType = CHESS_PIECE

    protected plug(): Observer[] {
        return []
    }
}

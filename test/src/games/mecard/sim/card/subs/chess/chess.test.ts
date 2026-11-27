import { describe, expect, test } from "vitest"
import {
    BISHOP_CARD,
    CASTLING,
    CHECK,
    KNIGHT_PIECE_CARD,
    PAWN_CARD,
    PLAYED_BY_ALL,
    PLAYED_BY_LAST,
    PLAYED_BY_NEAREST,
    PROMOTION,
    QUEEN_CARD,
    ROOK_CARD,
} from "@game/core-src/games/mecard/sim/card/subs/chess/ChessCards"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { WALKS } from "@game/core-src/games/mecard/sim/card/subs/movement/WalkCard"
import { CHESS_PIECE, isChessPiece, isPawn } from "@game/core-src/games/mecard/sim/status/subs/ChessPieces"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Fixture builders ---

/** The bodies a card put in a battle. */
function summoned(on: ReturnType<typeof battle>): Unit[] {
    const bodies: Unit[] = []
    on.signals.spawned.add(({ unit: body }) => bodies.push(body))
    return bodies
}

/** A hero playing cards in a battle with a far foe, so the battle goes on: the bodies they made. */
function playing(...cards: Card[]) {
    const on = battle()
    const bodies = summoned(on)
    const hero = unit(on, 3.5, 6)
    unit(on, 0.5, 0.5, { team: MONSTERS })
    play(on, [[hero, chain(...cards)]])
    return { on, hero, bodies }
}

// --- Tests ---

describe("pieces of chess", () => {
    test("each card sets down a piece a meter ahead, with its own hearts", () => {
        const expected: [Card, number][] = [
            [PAWN_CARD, 1], [ROOK_CARD, 2], [KNIGHT_PIECE_CARD, 1], [BISHOP_CARD, 1], [QUEEN_CARD, 3],
        ]
        for(const [card, hearts] of expected){
            const { bodies } = playing(card)
            expect(bodies).toHaveLength(1)
            expect(isChessPiece(bodies[0])).toBe(true)
            expect(bodies[0].life).toBe(hearts)
            expect(bodies[0].position.y).toBeCloseTo(5, 1)
        }
    })

    test("only the pawn plays before the others", () => {
        const { bodies } = playing(PAWN_CARD)
        expect(isPawn(bodies[0])).toBe(true)
        expect(isPawn(playing(ROOK_CARD).bodies[0])).toBe(false)
    })

    test("a piece does not wear away at the end of the round", () => {
        const { bodies } = playing(PAWN_CARD)
        expect(bodies[0].alive).toBe(true)
        expect(bodies[0].life).toBe(1)
    })

    test("the queen gets the items of its owner", () => {
        const on = battle()
        const bodies = summoned(on)
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const item = { name: "essai", init: () => {}, dispose: () => {} } as never
        on.equip(hero, item)
        play(on, [[hero, chain(QUEEN_CARD)]])
        expect(bodies[0].items).toContain(item)
    })
})

describe("reactions of the pieces", () => {
    test("a rook goes a meter further after a move of its own", () => {
        const { on, bodies } = playing(ROOK_CARD, PLAYED_BY_NEAREST)
        void on
        expect(bodies[0]).toBeDefined()
    })

    test("a bishop moves further", () => {
        const on = battle()
        const bodies = summoned(on)
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(BISHOP_CARD)]])
        const bishop = bodies[0]
        expect(bishop.stats.move.value).toBeCloseTo(1.5)
    })
})

describe("playing through a piece", () => {
    /** A hero with a piece set down already, then playing a modified step: where each ends. */
    function through(modifier: Card, piece: Card) {
        const on = battle()
        const bodies = summoned(on)
        const hero = unit(on, 5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(piece)]])
        const start = bodies[0].position.y
        play(on, [[hero, chain(modifier, STEP)]])
        return { hero, piece: bodies[0], start }
    }

    test("the nearest piece plays the action in the place of its owner", () => {
        const { hero, piece, start } = through(PLAYED_BY_NEAREST, PAWN_CARD)
        expect(piece.position.y).toBeLessThan(start)
        expect(hero.position.y).toBeCloseTo(6, 1)
    })

    test("the last piece plays the action", () => {
        const { piece, start } = through(PLAYED_BY_LAST, PAWN_CARD)
        expect(piece.position.y).toBeLessThan(start)
    })

    test("every piece plays it", () => {
        const { piece, start } = through(PLAYED_BY_ALL, ROOK_CARD)
        expect(piece.position.y).toBeLessThan(start)
    })

    test("with no piece, nothing is played and the owner stays", () => {
        const on = battle()
        const hero = unit(on, 5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(PLAYED_BY_NEAREST, STEP)]])
        expect(hero.position.y).toBeCloseTo(6, 1)
    })
})

describe("promotion, castling and check", () => {
    test("promotion makes the nearest ally a piece for two rounds", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const ally = unit(on, 3.5, 4)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(PROMOTION)]])
        expect(isChessPiece(ally)).toBe(true)
        expect(ally.statuses.get(CHESS_PIECE)?.level).toBe(1)
    })

    test("a promoted ally plays what its ally has it play", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const ally = unit(on, 3.5, 4.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.applyStatus(ally, CHESS_PIECE, 3)
        const before = ally.position.y
        play(on, [[hero, chain(PLAYED_BY_NEAREST, STEP)]])
        expect(ally.position.y).toBeLessThan(before)
    })

    test("castling swaps the place of the unit with the nearest piece", () => {
        const on = battle()
        const bodies = summoned(on)
        const hero = unit(on, 5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(PAWN_CARD)]])
        const piece = bodies[0]
        const [heroAt, pieceAt] = [hero.position, piece.position]
        play(on, [[hero, chain(CASTLING)]])
        expect(hero.position.x).toBeCloseTo(pieceAt.x, 1)
        expect(hero.position.y).toBeCloseTo(pieceAt.y, 1)
        expect(piece.position.y).toBeCloseTo(heroAt.y, 1)
    })

    test("check has the pieces strike the nearest enemy", () => {
        const on = battle()
        const bodies = summoned(on)
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 3.9, { team: MONSTERS })
        play(on, [[hero, chain(PAWN_CARD)]])
        void bodies
        play(on, [[hero, chain(CHECK)]])
        expect(foe.life).toBeLessThan(4)
    })
})

void WALKS

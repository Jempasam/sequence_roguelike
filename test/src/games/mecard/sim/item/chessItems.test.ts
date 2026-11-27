import { describe, expect, test } from "vitest"
import { PAWN_CARD } from "@game/core-src/games/mecard/sim/card/subs/chess/ChessCards"
import { DODGE_CARD } from "@game/core-src/games/mecard/sim/card/subs/combat/DodgeCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { GLASS_HEART } from "@game/core-src/games/mecard/sim/heart/subs/GlassHeartKind"
import {
    ASHTRAY,
    HORSESHOE,
    KING_CROWN,
    SPURS,
} from "@game/core-src/games/mecard/sim/item/subs/combat/ChessItems"
import { CHESS_PIECE } from "@game/core-src/games/mecard/sim/status/subs/ChessPieces"
import { DODGE } from "@game/core-src/games/mecard/sim/status/subs/Dodge"
import { SWIFT } from "@game/core-src/games/mecard/sim/status/subs/Swiftness"
import { STUNNED } from "@game/core-src/games/mecard/sim/status/subs/Stunned"
import {
    GLASS_FLASK,
    IRON_MAGNET,
    KITE,
    PAWN_POWDER,
    SILENCE_JAR,
    SPRING,
} from "@game/core-src/games/mecard/sim/usable/subs/hand/ChessUsables"
import type { Usable } from "@game/core-src/games/mecard/sim/usable/Usable"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Fixture builders ---

/** A usable used by a unit, as the battle does it: a charge in a slot of the belt. */
function using(on: ReturnType<typeof battle>, user: ReturnType<typeof unit>, usable: Usable): void {
    usable.use({ battle: on, unit: user }, { unit: user, carried: { usable, charges: usable.charges ?? 1 }, spend: () => {} } as never)
}

// --- Tests: items ---

describe("spurs", () => {
    test("a move that touches a unit gives a dodge", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        on.equip(hero, SPURS)
        unit(on, 3.5, 4.4, { team: MONSTERS })
        let given = false
        on.signals.statusAdded.add(({ unit: holder, type }) => { if(holder === hero && type === DODGE) given = true })
        play(on, [[hero, chain(STEP)]])
        expect(given).toBe(true)
    })
})

describe("king's crown", () => {
    test("each body the unit summons has one more strength", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.equip(hero, KING_CROWN)
        const bodies: ReturnType<typeof unit>[] = []
        on.signals.spawned.add(({ unit: body }) => bodies.push(body))
        play(on, [[hero, chain(PAWN_CARD)]])
        expect(bodies[0].stats.strength.value).toBe(1)
    })
})

describe("ashtray", () => {
    test("a positive status that comes lasts a round more", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.equip(hero, ASHTRAY)
        on.applyStatus(hero, SWIFT, 2)
        expect(hero.statuses.get(SWIFT)?.level).toBe(3)
    })
})

describe("horseshoe", () => {
    test("a dodge takes the unit a meter ahead", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.equip(hero, HORSESHOE)
        play(on, [[hero, chain(DODGE_CARD)]])
        expect(hero.position.y).toBeLessThan(5.5)
    })
})

// --- Tests: usables ---

describe("usables of chess and glass", () => {
    test("the spring throws its user back", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        using(on, hero, SPRING)
        expect(hero.position.y).toBeGreaterThan(4)
    })

    test("the silence jar stuns the nearest enemy", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        using(on, hero, SILENCE_JAR)
        expect(foe.statusOf(STUNNED)?.level).toBe(1)
    })

    test("the kite carries its user over everything", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 3.5, 5, { team: MONSTERS })
        using(on, hero, KITE)
        expect(hero.position.y).toBeLessThan(2)
    })

    test("the iron magnet pulls the bodies of its user", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const bodies: ReturnType<typeof unit>[] = []
        on.signals.spawned.add(({ unit: body }) => bodies.push(body))
        play(on, [[hero, chain(PAWN_CARD)]])
        const before = bodies[0].position.distance(hero.position)
        using(on, hero, IRON_MAGNET)
        expect(bodies[0].position.distance(hero.position)).toBeLessThan(before)
    })

    test("the pawn powder makes the nearest ally a piece", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const ally = unit(on, 3.5, 4.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        using(on, hero, PAWN_POWDER)
        expect(ally.statuses.has(CHESS_PIECE)).toBe(true)
    })

    test("the glass flask gives two glass hearts", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const before = hero.hearts.all.filter(heart => heart.kind === GLASS_HEART).length
        using(on, hero, GLASS_FLASK)
        expect(hero.hearts.all.filter(heart => heart.kind === GLASS_HEART).length - before).toBe(2)
    })
})

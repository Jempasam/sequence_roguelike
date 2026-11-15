import { describe, expect, test } from "vitest"
import { OVERHEATED, OVERHEAT_CARD } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Tests ---

describe("overheat", () => {
    test("raises the strength, the precision, the move, the chain and the draw by one", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const stats = hero.stats
        const before = [
            stats.strength.value, stats.precision.value, stats.move.value, stats.chainSize.value, stats.draw.value,
        ]
        on.applyStatus(hero, OVERHEATED, 3)
        const after = [
            stats.strength.value, stats.precision.value, stats.move.value, stats.chainSize.value, stats.draw.value,
        ]
        expect(after.map((value, index) => value - before[index])).toEqual([1, 1, 1, 1, 1])
    })

    test("a card gives it for three rounds", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(OVERHEAT_CARD)]])
        expect(hero.statuses.get(OVERHEATED)?.level).toBe(2)
    })

    test("a kill gives a round back", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const victim = unit(on, 3.5, 5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.applyStatus(hero, OVERHEATED, 3)
        victim.hearts.slay(hero)
        expect(hero.statuses.get(OVERHEATED)?.level).toBe(4)
    })

    test("the unit dies when the last round ends", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        on.applyStatus(hero, OVERHEATED, 1)
        on.endPreparation()
        on.playRound()
        expect(hero.alive).toBe(false)
    })

    test("the stats are back to normal once it is gone", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const strength = hero.stats.strength.value
        on.applyStatus(hero, OVERHEATED, 3)
        on.removeStatus(hero, OVERHEATED)
        expect(hero.stats.strength.value).toBe(strength)
    })
})

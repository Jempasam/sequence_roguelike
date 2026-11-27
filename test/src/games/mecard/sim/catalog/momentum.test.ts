import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_USABLES } from "@game/core-src/games/mecard/sim/catalog/usables"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { PREDATOR_EYE, ROLLER } from "@game/core-src/games/mecard/sim/item/subs/combat/Stride"
import { MOMENTUM } from "@game/core-src/games/mecard/sim/status/subs/Momentum"
import { REACTION_BOOTS } from "@game/core-src/games/mecard/sim/usable/subs/elixir/StatusElixirs"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Item } from "@game/core-src/games/mecard/sim/item/Item"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../fixtures"

// --- Fixtures ---

/** A hero holding items, in the middle of the arena, facing up. */
function holding(on: Battle, ...items: Item[]): Unit {
    return on.add({
        name: "hero", team: HEROES, controller: "player", position: new Vector2(3.5, 4.5), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [[]], items,
    })
}

/** What the unit has at the end of each of its steps, told by a reading made then. */
function readAtEachStep<T>(hero: Unit, read: () => T): T[] {
    const readings: T[] = []
    hero.stepEnded.add(() => readings.push(read()))
    return readings
}

// --- Tests ---

describe("the eye of the predator", () => {
    test("a half turn on the spot → one strength more until the round ends", () => {
        const on = battle()
        const hero = holding(on, PREDATOR_EYE)
        unit(on, 3.5, 6.5, { team: MONSTERS })
        const base = hero.stats.strength.value
        const readings = readAtEachStep(hero, () => hero.stats.strength.value)
        play(on, [[hero, chain(AIM)]])
        expect(readings).toEqual([base + 1])
        expect(hero.stats.strength.value).toBe(base)
    })

    test("a turn of less than 90° → nothing", () => {
        const on = battle()
        const hero = holding(on, PREDATOR_EYE)
        unit(on, 3.5, 0.5, { team: MONSTERS })
        const base = hero.stats.strength.value
        const readings = readAtEachStep(hero, () => hero.stats.strength.value)
        play(on, [[hero, chain(AIM)]])
        expect(readings).toEqual([base])
    })
})

describe("the momentum", () => {
    test("each round left → a quarter more range on its moves", () => {
        const slow = battle()
        const walker = holding(slow)
        unit(slow, 0.5, 0.5, { team: MONSTERS })
        play(slow, [[walker, chain(STEP)]])
        const plain = walker.position.distance(new Vector2(3.5, 4.5))

        const fast = battle()
        const runner = holding(fast)
        unit(fast, 0.5, 0.5, { team: MONSTERS })
        fast.applyStatus(runner, MOMENTUM, 2)
        play(fast, [[runner, chain(STEP)]])
        expect(runner.position.distance(new Vector2(3.5, 4.5))).toBeCloseTo(plain * 1.5, 1)
    })

    test("a move stopped by a unit with two rounds or more → it hurts it as many hearts more, and the momentum is lost", () => {
        const on = battle()
        const hero = holding(on)
        const wall = unit(on, 3.5, 3.5, { team: MONSTERS, hearts: Heart.many(BLUE_HEART, 6) })
        on.applyStatus(hero, MOMENTUM, 3)
        const held = readAtEachStep(hero, () => hero.statuses.has(MOMENTUM))
        play(on, [[hero, chain(STEP)]])
        // The step itself hurts by a heart when it runs into a unit: the momentum hurts as many more.
        expect(wall.hearts.all.length).toBe(6 - 1 - 3)
        expect(held).toEqual([false])
    })

    test("a move stopped by a unit with one round → nothing more is hurt, the momentum stays", () => {
        const on = battle()
        const hero = holding(on)
        const wall = unit(on, 3.5, 3.5, { team: MONSTERS, hearts: Heart.many(BLUE_HEART, 6) })
        on.applyStatus(hero, MOMENTUM, 1)
        const held = readAtEachStep(hero, () => hero.statuses.has(MOMENTUM))
        play(on, [[hero, chain(STEP)]])
        expect(wall.hearts.all.length).toBe(6 - 1)
        expect(held).toEqual([true])
    })

    test("a turn of more than 10° → the momentum is lost", () => {
        const on = battle()
        const hero = holding(on)
        unit(on, 6.5, 4.5, { team: MONSTERS })
        on.applyStatus(hero, MOMENTUM, 2)
        const held = readAtEachStep(hero, () => hero.statuses.has(MOMENTUM))
        play(on, [[hero, chain(AIM)]])
        expect(held).toEqual([false])
    })
})

describe("the roller skates", () => {
    test("a step along the gaze → one momentum", () => {
        const on = battle()
        const hero = holding(on, ROLLER)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const levels = readAtEachStep(hero, () => hero.statuses.get(MOMENTUM)?.level ?? 0)
        play(on, [[hero, chain(STEP)]])
        expect(levels).toEqual([1])
    })

    test("a turn on the spot → nothing", () => {
        const on = battle()
        const hero = holding(on, ROLLER)
        unit(on, 6.5, 4.5, { team: MONSTERS })
        const levels = readAtEachStep(hero, () => hero.statuses.get(MOMENTUM)?.level ?? 0)
        play(on, [[hero, chain(AIM)]])
        expect(levels).toEqual([0])
    })
})

describe("what the momentum brings", () => {
    test("the new items and usables → in the catalogs, the boots with two charges refilled each battle", () => {
        expect(ALL_ITEMS).toContain(PREDATOR_EYE)
        expect(ALL_ITEMS).toContain(ROLLER)
        expect(ALL_USABLES).toContain(REACTION_BOOTS)
        expect(REACTION_BOOTS.charges).toBe(2)
    })
})

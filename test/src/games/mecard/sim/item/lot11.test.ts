import { describe, expect, test } from "vitest"
import {
    ANCHOR, BLUE_HEART, METAL_DETECTOR, PIGGY_BANK, BREATHALYZER, CHALK, CHEWING_GUM, CONCENTRATED, DODGE, EXPIRED_PILLBOX, FRAGILE, Heart, PILLBOX,
    PLUMB_LINE, RED_HEART, ROOTED, SHIELD_HEART, SLOWED, SWIFT, URN, Vector2,
} from "@game/core/mecard"
import type { Battle, Item, Unit } from "@game/core/mecard"

import { battle, HEROES, MONSTERS, unit } from "../fixtures"

// --- Fixtures ---

/** A hero at a cell, facing up, carrying some items. */
function carrier(on: Battle, x: number, y: number, items: readonly Item[], shields = 0): Unit {
    return on.add({
        name: `c${on.units.length}`, team: HEROES, controller: "player", position: new Vector2(x, y), direction: Vector2.UP,
        hearts: [...Heart.many(RED_HEART, 4), ...Heart.many(SHIELD_HEART, shields)], decks: [[]], items,
    })
}

/** A monster at a cell. */
function foe(on: Battle, x: number, y: number): Unit {
    return unit(on, x, y, { team: MONSTERS })
}

/** The levels of every status of a unit, added up. */
function levels(target: Unit): number {
    return [...target.statuses.values()].reduce((total, status) => total + status.level, 0)
}

// --- Tests ---

describe("the breathalyzer", () => {
    test("four levels of status → one strength and one precision more, eight → two, a status gone → they go", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [BREATHALYZER])
        foe(on, 0.5, 0.5)
        on.startRound()
        on.applyStatus(hero, CONCENTRATED, 3)
        expect(hero.stats.strength.value).toBe(0)
        on.applyStatus(hero, DODGE, 1)
        expect(hero.stats.strength.value).toBe(1)
        expect(hero.stats.precision.value).toBe(1)
        on.applyStatus(hero, SLOWED, 4)
        expect(hero.stats.strength.value).toBe(2)
        on.removeStatus(hero, SLOWED)
        expect(hero.stats.precision.value).toBe(1)
    })
})

describe("the pillboxes", () => {
    test("a pillbox → two levels of a positive status at the first round", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [PILLBOX])
        foe(on, 0.5, 0.5)
        on.startRound()
        expect(levels(hero)).toBe(2)
        expect([...hero.statuses.keys()].every(type => type.polarity === "positive")).toBe(true)
    })

    test("an expired pillbox → four levels of a negative status at the first round", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [EXPIRED_PILLBOX])
        foe(on, 0.5, 0.5)
        on.startRound()
        expect(levels(hero)).toBe(4)
        expect([...hero.statuses.keys()].every(type => type.polarity === "negative")).toBe(true)
    })
})

describe("the plumb line", () => {
    test("no shield heart at the start → one more; two plumb lines → two, each reads the same start", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [PLUMB_LINE, PLUMB_LINE])
        foe(on, 0.5, 0.5)
        on.startRound()
        expect(hero.hearts.all.filter(heart => heart.kind === SHIELD_HEART)).toHaveLength(2)
    })

    test("a shield heart at the start → nothing", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [PLUMB_LINE], 1)
        foe(on, 0.5, 0.5)
        on.startRound()
        expect(hero.hearts.all.filter(heart => heart.kind === SHIELD_HEART)).toHaveLength(1)
    })
})

describe("the chalk", () => {
    test("the nearest enemy → fragile at the first round", () => {
        const on = battle()
        carrier(on, 3.5, 5.5, [CHALK])
        const near = foe(on, 3.5, 4)
        const far = foe(on, 0.5, 0.5)
        on.startRound()
        expect(near.statuses.get(FRAGILE)?.level).toBe(3)
        expect(far.statuses.has(FRAGILE)).toBe(false)
    })
})

describe("the chewing gum", () => {
    test("an enemy that hits its carrier → rooted", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [CHEWING_GUM])
        const enemy = foe(on, 3.5, 4.5)
        on.startRound()
        enemy.struck.notify({ attacker: enemy, target: hero, amount: 1 })
        hero.struck.notify({ attacker: enemy, target: hero, amount: 1 })
        expect(enemy.statuses.get(ROOTED)?.level).toBe(1)
    })
})

describe("the anchor", () => {
    test("a shove → half as far; its own moves → a quarter less", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [ANCHOR])
        const enemy = foe(on, 0.5, 0.5)
        on.startRound()
        const move = hero.stats.move.value
        expect(move).toBeCloseTo(0.75)
        const incoming = { target: hero, by: enemy, direction: Vector2.UP, distance: 2 }
        hero.incomingShove.notify(incoming)
        expect(incoming.distance).toBe(1)
    })
})

describe("the piggy bank", () => {
    test("45 gold in the purse → two blue hearts at the first round", () => {
        const on = battle()
        on.goldOf = () => 45
        const hero = carrier(on, 3.5, 5.5, [PIGGY_BANK])
        foe(on, 0.5, 0.5)
        on.startRound()
        expect(hero.hearts.all.filter(heart => heart.kind === BLUE_HEART)).toHaveLength(2)
    })
})

describe("the metal detector", () => {
    test("the last enemy killed by its carrier → one gold for each kill", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [METAL_DETECTOR])
        const first = foe(on, 0.5, 0.5)
        const second = foe(on, 1.5, 0.5)
        let gold = 0
        on.onGetGold.add(({ amount }) => {
            gold += amount
        })
        on.startRound()
        first.hearts.slay(hero)
        expect(gold).toBe(0)
        second.hearts.slay(hero)
        expect(gold).toBe(2)
    })
})

describe("the urn", () => {
    test("its carrier dies → its positive statuses go to its allies", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [URN])
        const ally = carrier(on, 4.5, 5.5, [])
        foe(on, 0.5, 0.5)
        on.startRound()
        on.applyStatus(hero, SWIFT, 2)
        hero.hearts.slay(null)
        expect(ally.statuses.get(SWIFT)?.level).toBe(2)
    })
})

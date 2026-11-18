import { describe, expect, test } from "vitest"
import {
    BLUE_HEART, Carried, DamageType, EXPLOSIVE, explosiveRadius, Heart, HEART_BOMB, PHOENIX_HEART, PLASTER,
    RED_HEART, RESURRECTED, RESURRECTION, Vector2,
} from "@game/core/mecard"

import { battle, MONSTERS, play, unit } from "../fixtures"

/** A battle with a monster far away, so it does not end, a hero to watch, and something to make it happen. */
function arena(options: { hearts?: number, items?: Parameters<ReturnType<typeof battle>["add"]>[0]["items"] } = {}) {
    const on = battle()
    unit(on, 6.5, 6.5, { team: MONSTERS, hearts: Heart.many(RED_HEART, 20) })
    const hero = on.add({
        name: "Héros", team: unit(on, 0.5, 0.5).team, controller: "player", position: new Vector2(3, 3), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, options.hearts ?? 4), decks: [[]], items: options.items,
    })
    return { on, hero }
}

describe("the explosive status", () => {
    test("its radius → the base and a share of each level", () => {
        expect(explosiveRadius(2)).toBeCloseTo(1.2)
        expect(explosiveRadius(4)).toBeGreaterThan(explosiveRadius(2))
    })

    test("a unit dying with it → hurts what is within the radius by as many hearts as the level, not what is beyond", () => {
        const { on, hero } = arena()
        const bomb = unit(on, 3.8, 3, { hearts: Heart.many(RED_HEART, 1) })
        const far = unit(on, 5.5, 3, { hearts: Heart.many(RED_HEART, 4) })
        on.applyStatus(bomb, EXPLOSIVE, 2)
        bomb.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(bomb.alive).toBe(false)
        expect(hero.life).toBe(2)
        expect(far.life).toBe(4)
    })

    test("a unit that lives → does not explode", () => {
        const { on, hero } = arena()
        const bomb = unit(on, 3.8, 3, { hearts: Heart.many(RED_HEART, 3) })
        on.applyStatus(bomb, EXPLOSIVE, 2)
        bomb.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(hero.life).toBe(4)
    })

    test("two of them in reach → the blast sets the other off", () => {
        const { on } = arena()
        const first = unit(on, 3.8, 3, { hearts: Heart.many(RED_HEART, 1) })
        const second = unit(on, 4.6, 3, { hearts: Heart.many(RED_HEART, 1) })
        const far = unit(on, 5.7, 3, { hearts: Heart.many(RED_HEART, 4) })
        on.applyStatus(first, EXPLOSIVE, 1)
        on.applyStatus(second, EXPLOSIVE, 1)
        first.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(second.alive).toBe(false)
        expect(far.life).toBe(3)
    })

    test("a heart bomb → starts its carrier explosive, once", () => {
        const { on, hero } = arena({ items: [HEART_BOMB] })
        on.startRound()
        expect(hero.statuses.get(EXPLOSIVE)?.level).toBe(2)
        play(on, [])
        expect(hero.statuses.get(EXPLOSIVE)?.level).toBe(2)
    })
})

describe("the resurrection status", () => {
    test("a deadly blow → the unit stands again with a heart healed and a blue heart, the status spent", () => {
        const { on, hero } = arena({ hearts: 1 })
        on.applyStatus(hero, RESURRECTED, 1)
        hero.hearts.damage(5, DamageType.PHYSICAL, null)
        expect(hero.alive).toBe(true)
        expect(hero.hearts.all.map(heart => [heart.kind, heart.isEmpty])).toEqual([[RED_HEART, false], [BLUE_HEART, false]])
        expect(hero.statuses.has(RESURRECTED)).toBe(false)
        hero.hearts.damage(5, DamageType.PHYSICAL, null)
        expect(hero.alive).toBe(false)
    })

    test("no blow deadly → nothing happens, it wears away with the rounds", () => {
        const { on, hero } = arena()
        on.applyStatus(hero, RESURRECTED, 2)
        play(on, [])
        expect(hero.statuses.get(RESURRECTED)?.level).toBe(1)
        play(on, [])
        expect(hero.statuses.has(RESURRECTED)).toBe(false)
    })

    test("a death that slays outright → no resurrection", () => {
        const { on, hero } = arena({ hearts: 2 })
        on.applyStatus(hero, RESURRECTED, 1)
        hero.hearts.slay(null)
        expect(hero.alive).toBe(false)
    })

    test("the usable → gives one resurrection a battle, which the next battle gives again", () => {
        const { on, hero } = arena({ hearts: 1 })
        const carried = new Carried(RESURRECTION)
        hero.usables.push(carried)
        on.startRound()
        on.activate(hero, [carried])
        on.endPreparation()
        expect(hero.statuses.has(RESURRECTED)).toBe(true)
        expect(carried.charges).toBe(0)
        expect(hero.usables).toContain(carried)
        on.refill(hero)
        expect(carried.charges).toBe(1)
    })
})

describe("the phoenix heart", () => {
    test("more than three hearts lost in a round → a resurrection, at once", () => {
        const { on, hero } = arena({ hearts: 8, items: [PHOENIX_HEART] })
        on.startRound()
        hero.hearts.damage(3, DamageType.PHYSICAL, null)
        expect(hero.statuses.has(RESURRECTED)).toBe(false)
        hero.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(hero.statuses.has(RESURRECTED)).toBe(true)
    })

    test("the blow that kills, with four hearts lost in the round → the unit stands again", () => {
        const { on, hero } = arena({ hearts: 4, items: [PHOENIX_HEART] })
        on.startRound()
        hero.hearts.damage(9, DamageType.PHYSICAL, null)
        expect(hero.alive).toBe(true)
        expect(hero.statuses.has(RESURRECTED)).toBe(false)
    })

    test("a few hearts lost in a round, then a few in the next → nothing", () => {
        const { on, hero } = arena({ hearts: 8, items: [PHOENIX_HEART] })
        on.startRound()
        hero.hearts.damage(3, DamageType.PHYSICAL, null)
        play(on, [])
        hero.hearts.damage(3, DamageType.PHYSICAL, null)
        expect(hero.statuses.has(RESURRECTED)).toBe(false)
    })
})

describe("the plaster", () => {
    test("a character who fell, once the fight is won → one more heart mended", () => {
        const hearts = Heart.many(RED_HEART, 3)
        for(const heart of hearts) heart.isEmpty = true
        hearts[0].isEmpty = false
        PLASTER.afterFight({ hearts, fell: true })
        expect(hearts.map(heart => heart.isEmpty)).toEqual([false, false, true])
    })

    test("a character who stood → nothing mended", () => {
        const hearts = Heart.many(RED_HEART, 3)
        hearts[1].isEmpty = true
        PLASTER.afterFight({ hearts, fell: false })
        expect(hearts.map(heart => heart.isEmpty)).toEqual([false, true, false])
    })
})

import { describe, expect, test } from "vitest"
import { DamageType, EXPLOSIVE, HEALING, Heart, RED_HEART, Vector2 } from "@game/core/mecard"

import { battle, MONSTERS, unit } from "../fixtures"

/** A battle with a monster far away, so it does not end, and a hero to watch. */
function arena() {
    const on = battle()
    unit(on, 6.5, 6.5, { team: MONSTERS, hearts: Heart.many(RED_HEART, 20) })
    const hero = on.add({
        name: "Héros", team: unit(on, 0.5, 0.5).team, controller: "player", position: new Vector2(3, 3),
        direction: Vector2.UP, hearts: Heart.many(RED_HEART, 4), decks: [[]],
    })
    return { on, hero }
}

describe("the statuses of a unit that dies", () => {
    test("a unit dying → holds no status any more, each told as removed", () => {
        const { on } = arena()
        const body = unit(on, 3.8, 3, { hearts: Heart.many(RED_HEART, 1) })
        on.applyStatus(body, HEALING, 1)
        const removed: unknown[] = []
        on.signals.statusRemoved.add(({ type }) => removed.push(type))
        body.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(body.alive).toBe(false)
        expect(body.statuses.size).toBe(0)
        expect(removed).toEqual([HEALING])
    })

    test("an explosive unit dying → still blows up, as it is told of the death before its statuses go", () => {
        const { on, hero } = arena()
        const bomb = unit(on, 3.8, 3, { hearts: Heart.many(RED_HEART, 1) })
        on.applyStatus(bomb, EXPLOSIVE, 2)
        bomb.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(hero.life).toBe(2)
        expect(bomb.statuses.size).toBe(0)
    })

    test("a healer that died → no longer heals at the end of a round", () => {
        const { on, hero } = arena()
        const healer = unit(on, 3.5, 3, { team: hero.team, hearts: Heart.many(RED_HEART, 1) })
        on.applyStatus(healer, HEALING, 4)
        hero.hearts.damage(2, DamageType.PHYSICAL, null)
        const before = hero.life
        healer.hearts.damage(1, DamageType.PHYSICAL, null)
        on.startRound()
        for(const unitOf of on.units) unitOf.steps.length = 0
        expect(hero.life).toBeLessThanOrEqual(before)
    })
})

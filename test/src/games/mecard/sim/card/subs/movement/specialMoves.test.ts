import { describe, expect, test } from "vitest"
import {
    Arena, Battle, BOUNCE_DASH, HEAD_JUMP, Heart, HUNT, KNIGHT_MOVE, LEAP, RED_HEART, Rooted,
    SHADOW_STEP, Vector2,
} from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit, withPillars } from "../../../fixtures"

// --- Tests ---

describe("KNIGHT_MOVE", () => {
    test("goes to its right, then ahead, without turning", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(KNIGHT_MOVE)]])
        expectAt(hero, 4, 3)
        expect(hero.direction.equals(Vector2.UP)).toBe(true)
    })

    test("its preview says where it stops", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        const [root] = chain(KNIGHT_MOVE).preview(on, hero, false)
        expect(root.preview?.pose.position.x).toBeCloseTo(4)
        expect(root.preview?.pose.position.y).toBeCloseTo(3)
    })
})

describe("LEAP", () => {
    test("goes over a body in its way", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 3, 4.5, { team: MONSTERS })
        play(on, [[hero, chain(LEAP)]])
        expectAt(hero, 3, 3)
        expect(hero.life).toBe(4)
    })

    test("landing on a pillar → thrown aside for a heart", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3, 3), radius: 0.3 })
        const hero = unit(on, 3, 6)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(LEAP)]])
        expect(hero.life).toBe(3)
        expect(on.free(hero.position, hero)).toBe(true)
    })

    test("a rooted unit does not leap", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 6, 1, { team: MONSTERS })
        on.applyStatus(hero, new Rooted(2))
        play(on, [[hero, chain(LEAP)]])
        expectAt(hero, 3, 6)
    })
})

describe("BOUNCE_DASH", () => {
    test("nothing in the way → one leg", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(BOUNCE_DASH)]])
        expectAt(hero, 3, 3.5)
    })

    test("a wall → bounces back, facing the other way, for a whole leg", () => {
        const on = battle()
        const hero = unit(on, 3, 1)
        unit(on, 6, 6, { team: MONSTERS })
        play(on, [[hero, chain(BOUNCE_DASH)]])
        expect(hero.position.y).toBeCloseTo(hero.radius + 1.5, 1)
        expect(hero.direction.equals(Vector2.DOWN)).toBe(true)
    })

    test("a corridor shorter than a leg → stops after its last bounce", () => {
        const on = new Battle(new Arena(1.5, 7), 1)
        const hero = unit(on, 0.75, 3, { direction: Vector2.RIGHT })
        unit(on, 0.75, 6, { team: MONSTERS })
        play(on, [[hero, chain(BOUNCE_DASH)]])
        expect(on.arena.inside(hero.position, hero.radius)).toBe(true)
        expect(on.units[0].life).toBe(4)
    })

    test("its preview bounces as it plays", () => {
        const on = battle()
        const hero = unit(on, 3, 1)
        const foe = unit(on, 6, 6, { team: MONSTERS })
        on.startRound()
        const [root] = chain(BOUNCE_DASH).preview(on, hero, false)
        expect(root.preview?.pose.direction.equals(Vector2.DOWN)).toBe(true)
        expect(foe.alive).toBe(true)
    })
})

describe("HEAD_JUMP", () => {
    test("nobody under → one jump", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(HEAD_JUMP)]])
        expectAt(hero, 3, 4)
    })

    test("a body under → wounded, and the unit jumps again", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const under = unit(on, 3, 4, { team: MONSTERS, hearts: Heart.many(RED_HEART, 8) })
        play(on, [[hero, chain(HEAD_JUMP)]])
        expect(under.life).toBe(7)
        expectAt(hero, 3, 2)
        expect(hero.life).toBe(4)
    })

    test("the jumps used up on bodies → thrown aside for a heart", () => {
        const on = battle()
        const hero = unit(on, 3, 6.5, { hearts: Heart.many(RED_HEART, 8) })
        const hearts = Heart.many(RED_HEART, 8)
        for(const y of [4.5, 2.5, 0.5]) unit(on, 3, y, { team: MONSTERS, hearts })
        play(on, [[hero, chain(HEAD_JUMP)]])
        expect(hero.life).toBe(7)
        expect(on.free(hero.position, hero)).toBe(true)
    })
})

describe("SHADOW_STEP", () => {
    test("nothing in the way → a plain walk", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(SHADOW_STEP)]])
        expectAt(hero, 3, 3)
    })

    test("a wall of the arena → comes back by the opposite one, and goes on", () => {
        const on = battle()
        const hero = unit(on, 3, 1)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(SHADOW_STEP)]])
        expect(hero.position.x).toBeCloseTo(3)
        expect(hero.position.y).toBeCloseTo(7 - hero.radius - 2, 1)
    })

    test("a body in the way → stops there, no way through", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        unit(on, 3, 2, { team: MONSTERS })
        play(on, [[hero, chain(SHADOW_STEP)]])
        expect(hero.position.y).toBeGreaterThan(2)
        expect(hero.position.y).toBeLessThan(3)
    })

    test("a pillar in the way → stops there, no way through", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3, 3), radius: 0.5 })
        const hero = unit(on, 3, 4.5)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(SHADOW_STEP)]])
        expect(hero.position.y).toBeCloseTo(3 + 0.5 + hero.radius, 1)
    })
})

describe("HUNT", () => {
    test("jumps into the back of the frailest feverish enemy, however far", () => {
        const on = battle()
        const hero = unit(on, 1, 6)
        const healthy = unit(on, 1, 1, { team: MONSTERS })
        const target = unit(on, 5, 3, { team: MONSTERS, direction: Vector2.DOWN })
        for(const heart of target.hearts.all.slice(-3)) heart.isEmpty = true
        play(on, [[hero, chain(HUNT)]])
        expect(healthy.feverish).toBe(false)
        expect(hero.direction.equals(Vector2.DOWN)).toBe(true)
        expect(hero.position.y).toBeLessThan(target.position.y)
        expect(hero.position.x).toBeCloseTo(5)
    })

    test("nobody feverish → the unit stays", () => {
        const on = battle()
        const hero = unit(on, 1, 6)
        unit(on, 5, 1, { team: MONSTERS })
        play(on, [[hero, chain(HUNT)]])
        expectAt(hero, 1, 6)
    })
})

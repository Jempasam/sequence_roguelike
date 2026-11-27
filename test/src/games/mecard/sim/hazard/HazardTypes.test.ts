import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { Box } from "@game/core-src/games/mecard/sim/battle/hitbox/Box"
import {
    ALL_HAZARDS,
    CONVEYOR,
    EXPLOSIVE_BARREL,
    FLAMETHROWER_TURRET,
    GEYSER,
    hazardTypeById,
    HOLE,
    PATROL_ROBOT,
    PILLAR,
    PIRATE_CANNON,
    PIRATE_SHIP,
    PISTON,
    PUDDLE_ZONE,
    TORII,
    WALL,
} from "@game/core-src/games/mecard/sim/catalog/hazards"
import { EXPLOSIVE } from "@game/core-src/games/mecard/sim/status/subs/Explosive"
import { SLOWED } from "@game/core-src/games/mecard/sim/status/subs/Slowness"
import * as Walk from "@game/core-src/games/mecard/sim/battle/mecanic/walk"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

const UP = Vector2.UP
const RIGHT = Vector2.RIGHT
const DOWN = Vector2.DOWN

/** A battle on which a monster far from everything keeps it from ending, and a hero to watch. */
function stage(heroAt: Vector2): { on: Battle, hero: ReturnType<typeof unit> } {
    const on = battle()
    unit(on, 6.5, 6.5, { team: MONSTERS })
    const hero = unit(on, heroAt.x, heroAt.y)
    return { on, hero }
}

/** Play the round out, nobody planning anything. */
function pass(on: Battle, rounds = 1): void {
    for(let round = 0; round < rounds; round++) play(on, [])
}

describe("the catalog of hazards", () => {
    test("every hazard → its own id and name, found by its id", () => {
        expect(new Set(ALL_HAZARDS.map(each => each.id)).size).toBe(ALL_HAZARDS.length)
        expect(new Set(ALL_HAZARDS.map(each => each.name)).size).toBe(ALL_HAZARDS.length)
        for(const each of ALL_HAZARDS) expect(hazardTypeById(each.id)).toBe(each)
        expect(() => hazardTypeById("nope")).toThrow("nope")
    })

    test("every hazard → laid out on an empty arena, its bodies of the scenery", () => {
        for(const each of ALL_HAZARDS){
            const on = battle()
            unit(on, 0.5, 6.5)
            const laid = each.lay(on, new Vector2(3.5, 3.5))
            expect(laid.length, each.id).toBe(each.bodies.length)
            for(const body of laid){
                expect(body.team.name, each.id).toBe("Décor")
                expect(body.decisive, each.id).toBe(false)
                expect(body.targetable, each.id).toBe(false)
            }
        }
    })

    test("no room → told", () => {
        const on = battle()
        unit(on, 3.5, 3.5)
        expect(() => PILLAR.lay(on, new Vector2(3.5, 3.5))).toThrow(/no room/i)
    })
})

describe("the hazards that stand", () => {
    test("a wall → a box that blocks, and shots stop on", () => {
        const { on, hero } = stage(new Vector2(3.5, 5))
        const [wall] = WALL.lay(on, new Vector2(3.5, 3), RIGHT)
        expect(wall.hitbox).toEqual(new Box(3, 0.5))
        expect(Walk.spot(on, hero, hero.position, UP, 3).to.y).toBeGreaterThan(3.25)
        expect(on.ray(hero, 6, hero).end.y).toBeCloseTo(3.25)
    })

    test("an arch → two posts with room between, one to each side", () => {
        const { on } = stage(new Vector2(0.5, 6.5))
        const posts = TORII.lay(on, new Vector2(3.5, 3), DOWN)
        expect(posts).toHaveLength(2)
        const walker = unit(on, 3.5, 5, { team: MONSTERS })
        expect(Walk.spot(on, walker, walker.position, UP, 3).distance).toBeCloseTo(3)
    })

    test("a pillar, a tree → the same disk of the scenery as a pillar of old", () => {
        const { on, hero } = stage(new Vector2(3.5, 5))
        PILLAR.lay(on, new Vector2(3.5, 3))
        expect(on.enemiesOf(hero).every(each => each.team.name !== "Décor")).toBe(true)
        expect(on.touchables.every(each => each.team.name !== "Décor")).toBe(true)
    })
})

describe("the hazards that act", () => {
    test("a hole → whoever is in it at its turn loses a heart", () => {
        const { on, hero } = stage(new Vector2(3, 3))
        HOLE.lay(on, new Vector2(3, 3))
        const before = hero.life
        pass(on)
        expect(hero.life).toBe(before - 1)
    })

    test("a hole → leaves alone whoever stands off it", () => {
        const { on, hero } = stage(new Vector2(0.5, 0.5))
        HOLE.lay(on, new Vector2(3, 3))
        const before = hero.life
        pass(on)
        expect(hero.life).toBe(before)
    })

    test("a puddle → slows whoever is in it", () => {
        const { on, hero } = stage(new Vector2(3, 3))
        PUDDLE_ZONE.lay(on, new Vector2(3, 3))
        pass(on)
        expect(hero.statuses.has(SLOWED)).toBe(true)
    })

    test("a conveyor → carries whoever is on its belt, hurting nobody", () => {
        const { on, hero } = stage(new Vector2(3, 3))
        const before = hero.life
        CONVEYOR.lay(on, new Vector2(1, 3), RIGHT)
        pass(on)
        expect(hero.position.x).toBeGreaterThan(4.5)
        expect(hero.life).toBe(before)
    })

    test("a conveyor → leaves alone whoever is off its belt", () => {
        const { on, hero } = stage(new Vector2(3, 6))
        CONVEYOR.lay(on, new Vector2(1, 3), RIGHT)
        pass(on)
        expect(hero.position.x).toBeCloseTo(3)
    })

    test("a piston → throws what stands before it", () => {
        const { on, hero } = stage(new Vector2(3, 4.3))
        PISTON.lay(on, new Vector2(3, 3), DOWN)
        pass(on)
        expect(hero.position.y).toBeGreaterThan(4.3)
    })

    test("a flamethrower → burns what stands before it", () => {
        const { on, hero } = stage(new Vector2(3, 4))
        const before = hero.life
        FLAMETHROWER_TURRET.lay(on, new Vector2(3, 2.5), DOWN)
        pass(on)
        expect(hero.life).toBeLessThan(before)
    })

    test("a geyser → throws away what is around it", () => {
        const { on, hero } = stage(new Vector2(3.8, 3))
        GEYSER.lay(on, new Vector2(3, 3))
        pass(on)
        expect(hero.position.distance(new Vector2(3, 3))).toBeGreaterThan(0.8)
    })

    test("a patrolling robot → goes along its line, then faces back", () => {
        const { on } = stage(new Vector2(5.5, 5.5))
        const [robot] = PATROL_ROBOT.lay(on, new Vector2(1, 1), DOWN)
        pass(on)
        expect(robot.position.y).toBeGreaterThan(3)
        expect(robot.position.x).toBeCloseTo(1)
        expect(robot.direction.y).toBeLessThan(0)
    })

    test("a patrolling robot → hurts the unit in its way", () => {
        const { on, hero } = stage(new Vector2(1, 3.2))
        PATROL_ROBOT.lay(on, new Vector2(1, 1), DOWN)
        const before = hero.life
        pass(on)
        expect(hero.life).toBeLessThan(before)
    })

    test("a pirate ship → crosses the arena and is gone", () => {
        const { on } = stage(new Vector2(0.5, 6.5))
        const [ship] = PIRATE_SHIP.lay(on, new Vector2(0.5, 3), RIGHT)
        pass(on, 4)
        expect(on.units.includes(ship)).toBe(false)
    })

    test("a pirate cannon → fires a ball that hurts what it flies at", () => {
        const { on, hero } = stage(new Vector2(4, 3))
        PIRATE_CANNON.lay(on, new Vector2(1, 3), RIGHT)
        const before = hero.life
        pass(on)
        expect(hero.life).toBeLessThan(before)
    })
})

describe("an explosive barrel", () => {
    test("→ aimed at by nobody, touched by blows", () => {
        const { on, hero } = stage(new Vector2(5, 5))
        const [barrel] = EXPLOSIVE_BARREL.lay(on, new Vector2(3, 3))
        expect(on.enemiesOf(hero)).not.toContain(barrel)
        expect(on.touchables).toContain(barrel)
        expect(barrel.statuses.get(EXPLOSIVE)?.level).toBe(2)
    })

    test("destroyed → hurts what is around it, the one who destroyed it too", () => {
        const { on, hero } = stage(new Vector2(3.8, 3))
        const [barrel] = EXPLOSIVE_BARREL.lay(on, new Vector2(3, 3))
        const before = hero.life
        barrel.hearts.damage(1, "physical" as never, hero)
        expect(barrel.alive).toBe(false)
        expect(hero.life).toBe(before - 2)
    })
})

describe("the hazards played to the end of a battle", () => {
    test("every hazard, ten rounds → no error", () => {
        for(const each of ALL_HAZARDS){
            const on = battle()
            unit(on, 6.5, 6.5, { team: MONSTERS })
            unit(on, 0.5, 6.5)
            each.lay(on, new Vector2(3.5, 3.5))
            pass(on, 10)
            expect(on.events.filter(event => event.type === "error"), each.id).toEqual([])
        }
        void chain
    })
})

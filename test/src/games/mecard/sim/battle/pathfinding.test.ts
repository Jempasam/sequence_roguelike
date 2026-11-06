import { describe, expect, test } from "vitest"
import { Arena, Battle, PATH_AIM, pathTo, STEP, Vector2 } from "@game/core/mecard"
import type { Pillar } from "@game/core/mecard"

import { chain, MONSTERS, play, unit, withPillars } from "../fixtures"

/** A battle on an arena of 7 by 7 with pillars at some points, each 0.45 m wide. */
function among(...points: readonly (readonly [number, number])[]): Battle {
    const pillars: Pillar[] = points.map(([x, y]) => ({ center: new Vector2(x, y), radius: 0.45 }))
    return withPillars(new Battle(new Arena(7, 7), 1), ...pillars)
}

// --- Tests ---

describe("pathTo", () => {
    test("nothing in the way → straight to the target", () => {
        const on = among()
        const walker = unit(on, 1, 5)
        const target = unit(on, 5, 1, { team: MONSTERS })
        const path = pathTo(on, walker, walker.position, target)
        expect(path).toHaveLength(1)
        expect(path[0].distance(target.position)).toBe(0)
    })

    test("a pillar in the way → around it, then to the target", () => {
        const on = among([3.5, 3.5])
        const walker = unit(on, 3.5, 5.5)
        const target = unit(on, 3.5, 1.5, { team: MONSTERS })
        const path = pathTo(on, walker, walker.position, target)
        expect(path.length).toBeGreaterThan(1)
        expect(Math.abs(path[0].x - 3.5)).toBeGreaterThan(0.3)
        expect(path.at(-1)?.distance(target.position)).toBe(0)
    })

    test("an ally in the way → around it", () => {
        const on = among()
        const walker = unit(on, 3.5, 5.5)
        unit(on, 3.5, 3.5)
        const target = unit(on, 3.5, 1.5, { team: MONSTERS })
        expect(Math.abs(pathTo(on, walker, walker.position, target)[0].x - 3.5)).toBeGreaterThan(0.3)
    })

    test("a target walled in → as near as it gets", () => {
        const on = among([0.5, 2.2], [1.3, 1.3], [2.2, 0.5])
        const walker = unit(on, 5, 5)
        const target = unit(on, 0.5, 0.5, { team: MONSTERS })
        const path = pathTo(on, walker, walker.position, target)
        const end = path.at(-1)
        expect(end).toBeDefined()
        expect(end && end.distance(target.position)).toBeLessThan(walker.position.distance(target.position))
        expect(end && end.distance(target.position)).toBeGreaterThan(0)
    })

    test("the same battle twice → the same way", () => {
        const way = (): readonly Vector2[] => {
            const on = among([3, 3], [4, 2])
            const walker = unit(on, 3.5, 5.5)
            return pathTo(on, walker, walker.position, unit(on, 3.5, 0.5, { team: MONSTERS }))
        }
        expect(way()).toEqual(way())
    })
})

describe("PATH_AIM", () => {
    test("a pillar in the way → faces around it, and the step goes there", () => {
        const on = among([3.5, 3.5])
        const walker = unit(on, 3.5, 5)
        unit(on, 3.5, 2, { team: MONSTERS })
        play(on, [[walker, chain(PATH_AIM, STEP)]])
        expect(Math.abs(walker.direction.x)).toBeGreaterThan(0.1)
        expect(Math.abs(walker.position.x - 3.5)).toBeGreaterThan(0.1)
    })

    test("no enemy within 0.8 of the vision → keeps its facing", () => {
        const on = among()
        const walker = unit(on, 1, 6)
        unit(on, 1, 2.5, { team: MONSTERS, direction: Vector2.UP })
        play(on, [[walker, chain(PATH_AIM)]])
        expect(walker.direction).toEqual(Vector2.UP)
    })

    test("its preview → the way as an arrow, and the facing it would take", () => {
        const on = among([3.5, 3.5])
        const walker = unit(on, 3.5, 5)
        unit(on, 3.5, 2, { team: MONSTERS })
        const [root] = chain(PATH_AIM).preview(on, walker, false)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon", "arrow"])
        expect(root.preview?.pose.direction.x).not.toBe(0)
    })
})

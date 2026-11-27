import { describe, expect, test } from "vitest"
import { Vec3 } from "@game/core-src/engine/math/Vec3"
import { defaultLevels } from "@game/core-src/games/cosmos/level/defaultLevels"
import { Pose } from "@game/core-src/games/cosmos/level/Pose"
import { World } from "@game/core-src/games/cosmos/level/World"
import { Space } from "@game/core-src/games/cosmos/space/Space"

// --- Fixture builders ---

function world(seed = 1): World {
    return new World(seed, defaultLevels())
}

function spaceOf(seed = 1): Space {
    return new Space(world(seed).registry.get("universe"))
}

function near(a: Vec3, b: Vec3, digits = 9): void {
    expect(a.x).toBeCloseTo(b.x, digits)
    expect(a.y).toBeCloseTo(b.y, digits)
    expect(a.z).toBeCloseTo(b.z, digits)
}

/** Zoom in, with no aim at all, until the space is at a level. */
function descendTo(space: Space, levelName: string, time = 0): void {
    for(let step = 0; step < 4000 && space.current.level.name !== levelName; step++){
        space.zoom(0.9)
        space.update(time)
    }
    expect(space.current.level.name).toBe(levelName)
}

function names(space: Space): string[] {
    return space.chain.map(step => step.level.name)
}

// --- Tests ---

describe("Level conversions", () => {
    test("enter then leave → the position comes back, at several times", () => {
        const space = spaceOf()
        const root = space.current
        for(const time of [0, 37.5, 1234]){
            const choice = root.level.pick(root.pose, time)!
            const pose = new Pose(new Vec3(0.1, 0.05, -0.2))
            const inner = choice.level.enter(pose, choice.at, time)
            near(choice.level.leave(inner, time).position, pose.position, 6)
        }
    })

    test("enter with snap → a position far outside lands inside the place", () => {
        const space = spaceOf()
        const { level, pose } = space.current
        const choice = level.pick(pose, 0)!
        const far = new Pose(new Vec3(0.9, 0.9, 0.9))
        const inner = choice.level.enter(far, choice.at, 0, true)
        expect(Math.hypot(inner.position.x, inner.position.y, inner.position.z)).toBeLessThanOrEqual(1 + 1e-9)
    })

    test("pick → the place nearest to the position, found by the level", () => {
        const w = world()
        const galaxy = w.root.children[5]
        const at = new Pose(galaxy.frame(0).origin.clone())
        expect(w.registry.get("universe").pick(at, 0)!.at).toEqual(galaxy.address)
    })
})

describe("Space", () => {
    test("zoom in from the whole → the levels go from the universe down to a person's spot", () => {
        const space = spaceOf()
        const seen = new Set<string>()
        for(let step = 0; step < 600; step++){
            space.zoom(0.8)
            space.update(step * 0.05)
            seen.add(space.current.level.name)
        }
        expect(seen).toContain("galaxy")
        expect(seen).toContain("system")
        expect(seen).toContain("planet")
        expect(seen).toContain("human")
    })

    test("zoom to the scale of the planets with no aim at all → the level becomes planet", () => {
        descendTo(spaceOf(3), "planet")
    })

    test("zoom in then out → the chain shrinks back", () => {
        const space = spaceOf()
        descendTo(space, "system")
        const depth = space.chain.length
        for(let i = 0; i < 400; i++){
            space.zoom(1.25)
            space.update(0)
        }
        expect(space.chain.length).toBeLessThan(depth)
    })

    test("keys move the pose of the current level → the level above follows", () => {
        const space = spaceOf()
        descendTo(space, "system")
        const above = space.chain[space.chain.length - 2].pose.position.clone()
        space.move(0.3, 0.1)
        space.update(0)
        expect(space.chain[space.chain.length - 2].pose.position.equals(above)).toBe(false)
    })

    test("same seed → same chain of levels", () => {
        const a = spaceOf(9)
        const b = spaceOf(9)
        for(let i = 0; i < 100; i++){
            a.zoom(0.8)
            b.zoom(0.8)
            a.update(i)
            b.update(i)
        }
        expect(names(a)).toEqual(names(b))
    })

    test("the view of each level of the chain → narrower going down", () => {
        const space = spaceOf()
        descendTo(space, "system")
        const sizes = space.viewSizes()
        for(let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(0)
        expect(sizes[0]).toBeLessThan(sizes[sizes.length - 1] * 1e3)
    })
})

describe("Anchor", () => {
    test("seen from its own level → the point never moves", () => {
        const space = spaceOf()
        descendTo(space, "system")
        const anchor = space.anchorHere()
        space.update(0)
        const first = anchor.in(space, 0).clone()
        near(first, anchor.in(space, 500), 6)
    })

    test("seen from the level above → the point moves with its place", () => {
        const space = spaceOf()
        descendTo(space, "planet")
        const anchor = space.anchorHere()
        for(let i = 0; i < 400 && space.current.level.name !== "system"; i++){
            space.zoom(1.25)
            space.update(0)
        }
        expect(space.current.level.name).toBe("system")
        const first = anchor.in(space, 0).clone()
        expect(first.equals(anchor.in(space, 40))).toBe(false)
    })

    test("the levels an anchor holds → those it was put under", () => {
        const space = spaceOf()
        descendTo(space, "system")
        expect(space.anchorHere().levels.map(level => level.name)).toEqual(names(space))
    })
})

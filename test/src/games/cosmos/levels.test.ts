import { describe, expect, test } from "vitest"
import { fractalNoise3, hash32, hashUnit, valueNoise3, Vec3 } from "@game/core"
import type { ChildKind, ElementData, Info } from "@game/core/cosmos"
import { defaultLevels, ElementLevel, galaxyDensity, Pose, Space, staticMotion, World } from "@game/core/cosmos"

// --- Fixture builders ---

class AtomLevel extends ElementLevel {
    public readonly name: string = "atom"
    public readonly label: string = "Atome"
    public readonly childKinds: readonly ChildKind[] = []
    public childCount(): number { return 0 }
    public describe(): ElementData {
        return { motion: staticMotion(new Vec3(), 1e-6), color: [1, 0, 0], glow: 0, palette: [], extra: {} }
    }
    public sampleAt(): Info { return { color: [1, 0, 0], density: 1, height: 0, liquid: false } }
}

class MoleculeLevel extends AtomLevel {
    public override readonly name: string = "molecule"
    public override readonly label: string = "Molécule"
    public override readonly childKinds: readonly ChildKind[] = [{ kind: "atom", weight: 1 }]
    public override childCount(): number { return 3 }
}

function spaceOf(seed: number): Space {
    return new Space(new World(seed, defaultLevels()).registry.get("universe"))
}

/** Zoom in, with no aim at all, until the space is at a level. */
function descendTo(space: Space, levelName: string): void {
    for(let step = 0; step < 4000 && space.current.level.name !== levelName; step++){
        space.zoom(0.9)
        space.update(0)
    }
    expect(space.current.level.name).toBe(levelName)
}

/** The density of galaxies at the point of a hashed number. */
function densityAt(seed: number, i: number): number {
    const at = (axis: number) => hashUnit(i, axis) * 1.8 - 0.9
    return galaxyDensity(seed, at(1), at(2), at(3))
}

// --- Tests ---

describe("Noise", () => {
    test("same arguments → same value", () => {
        expect(valueNoise3(3, 0.3, 0.5, 0.7)).toBe(valueNoise3(3, 0.3, 0.5, 0.7))
        expect(hash32(1, 2, 3)).toBe(hash32(1, 2, 3))
    })

    test("other seed → other value", () => {
        expect(valueNoise3(3, 0.3, 0.5, 0.7)).not.toBe(valueNoise3(4, 0.3, 0.5, 0.7))
    })

    test("a hashed unit → from 0 included to 1 excluded", () => {
        for(let i = 0; i < 200; i++){
            const value = hashUnit(5, i)
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThan(1)
        }
    })

    test("a deeper sum → the shallower sum plus the finer octaves, so nothing coarse changes", () => {
        const coarse = fractalNoise3(9, 0.31, 0.62, 0.12, 0, 3)
        const fine = fractalNoise3(9, 0.31, 0.62, 0.12, 0, 7)
        const only = fractalNoise3(9, 0.31, 0.62, 0.12, 4, 7)
        expect(fine).toBeCloseTo(coarse + only, 12)
    })
})

describe("Universe", () => {
    test("the density of galaxies → between 0 and 1, the same for the same seed and point", () => {
        for(let i = 0; i < 100; i++){
            const density = densityAt(7, i)
            expect(density).toBeGreaterThanOrEqual(0)
            expect(density).toBeLessThanOrEqual(1)
            expect(density).toBe(densityAt(7, i))
        }
    })

    test("galaxies → placed where the density is higher than average", () => {
        const world = new World(21, defaultLevels())
        const marks = world.registry.get("universe").landmarks(new Pose(), 0)
        let placed = 0
        for(const { frame: { origin: o } } of marks) placed += galaxyDensity(world.root.id, o.x, o.y, o.z)
        let anywhere = 0
        for(let i = 0; i < 400; i++) anywhere += densityAt(world.root.id, i)
        expect(placed / marks.length).toBeGreaterThan(anywhere / 400)
    })

    test("a galaxy → turns on itself, so its frame differs at two times", () => {
        const level = new World(5, defaultLevels()).registry.get("universe")
        const first = level.landmarks(new Pose(), 0)[0].frame.rotation
        const later = level.landmarks(new Pose(), 120)[0].frame.rotation
        expect(first.equals(later)).toBe(false)
    })
})

describe("Surface continuity", () => {
    test("the ground of a planet → the same at two times, as it is fixed on the planet", () => {
        const space = spaceOf(11)
        descendTo(space, "planet")
        const { level, pose } = space.current
        const probe = new Pose(new Vec3(0.1, 0.7, -0.2), undefined, pose.scale, pose.at)
        expect(level.sample(probe, 0).height).toBeCloseTo(level.sample(probe, 777).height, 9)
    })

    test("a point read from a planet and from its biome → the biome only adds fine detail", () => {
        const space = spaceOf(11)
        descendTo(space, "planet")
        const { level, pose } = space.current
        const onPlanet = new Pose(new Vec3(0.2, 0.9, 0.3), undefined, pose.scale, pose.at)
        const choice = level.pick(onPlanet, 0)!
        const inBiome = choice.level.enter(onPlanet, choice.at, 0)
        const asBiome = choice.level.sample(inBiome, 0)
        const asPlanet = level.sample(onPlanet, 0)
        expect(Math.abs(asBiome.height - asPlanet.height)).toBeLessThan(4)
    })
})

describe("Extensibility", () => {
    test("a level added to the registry → it is crossed without any change to the engine", () => {
        const registry = defaultLevels().register(new AtomLevel()).register(new MoleculeLevel())
        const space = new Space(new World(2, registry, "molecule").registry.get("molecule"))
        for(let step = 0; step < 400 && space.current.level.name !== "atom"; step++){
            space.zoom(0.9)
            space.update(0)
        }
        expect(space.current.level.name).toBe("atom")
    })

    test("two levels of the same name → refused", () => {
        expect(() => defaultLevels().register(new AtomLevel()).register(new AtomLevel())).toThrow()
    })

    test("an unknown kind → a clear error", () => {
        expect(() => defaultLevels().get("virus")).toThrow(/virus/)
    })

    test("a registry → serves one world only", () => {
        const registry = defaultLevels()
        void new World(1, registry)
        expect(() => new World(2, registry)).toThrow()
    })

    test("the kind of a child → follows the shares, always the same for the same child", () => {
        const world = new World(5, defaultLevels())
        const planet = world.root.children[0].children[0].children[0]
        const kinds = planet.children.map(child => child.level.name)
        expect(kinds).toEqual(planet.children.map(child => child.level.name))
        expect(new Set(kinds)).toEqual(new Set(["forest", "desert"]))
    })
})

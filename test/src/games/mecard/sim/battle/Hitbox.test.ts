import { describe, expect, test } from "vitest"
import {
    Arena, Areas, Battle, Box, Disk, Heart, loadedHitbox, PROJECTION, SLASH, SOLID_HEART, STEP, SWEEP, UNIT_RADIUS, Vector2,
    visual,
} from "@game/core/mecard"
import type { Pose } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

const UP = Vector2.UP
const RIGHT = Vector2.RIGHT

/** A pose at a point, facing up. */
function at(x: number, y: number, direction: Vector2 = UP): Pose {
    return { position: new Vector2(x, y), direction }
}

/** A wall of scenery: a box lying across, 4 m long, 0.4 m thick. */
function wall(on: Battle, x: number, y: number, direction: Vector2 = RIGHT): void {
    on.place(null, {
        name: "Mur", sprite: visual("units/pillar"), at: new Vector2(x, y), direction,
        hearts: [new Heart(SOLID_HEART)], hitbox: new Box(4, 0.4), targetable: false, touchable: false, movable: false,
    })
}

describe("Hitbox gap", () => {
    test("two disks → the distance of their centers less their radii", () => {
        const gap = new Disk(0.5).gap(at(0, 0), new Disk(0.25), at(3, 4))
        expect(gap).toBeCloseTo(5 - 0.75)
    })

    test("a disk against a box → from the side, the corner, and inside", () => {
        const box = new Box(4, 1)
        // Facing right, so 4 m along x and 1 m along y around the middle.
        expect(box.gap(at(0, 0, RIGHT), new Disk(0.5), at(3, 0))).toBeCloseTo(0.5)
        expect(box.gap(at(0, 0, RIGHT), new Disk(0.5), at(0, 2))).toBeCloseTo(1)
        expect(box.gap(at(0, 0, RIGHT), new Disk(0.5), at(2.5, 1))).toBeCloseTo(Math.hypot(0.5, 0.5) - 0.5)
        expect(box.gap(at(0, 0, RIGHT), new Disk(0.5), at(0, 0))).toBeLessThan(0)
    })

    test("a box against a disk → the same gap whichever asks", () => {
        const box = new Box(4, 1)
        const disk = new Disk(0.5)
        expect(disk.gap(at(0, 2), box, at(0, 0, RIGHT))).toBeCloseTo(box.gap(at(0, 0, RIGHT), disk, at(0, 2)))
    })

    test("two boxes → apart, touching, crossed", () => {
        const box = new Box(4, 1)
        expect(box.gap(at(0, 0, RIGHT), box, at(0, 3, RIGHT))).toBeCloseTo(2)
        expect(box.gap(at(0, 0, RIGHT), box, at(0, 1, RIGHT))).toBeCloseTo(0)
        expect(box.gap(at(0, 0, RIGHT), box, at(0, 0, UP))).toBeLessThan(0)
        expect(box.gap(at(0, 0, RIGHT), box, at(0, 0.5, UP))).toBeLessThan(0)
    })

    test("scaled → its measures times the factor", () => {
        expect(new Box(4, 1).scaled(2).reach).toBeCloseTo(new Box(8, 2).reach)
        expect(new Disk(0.35).scaled(2).radius).toBeCloseTo(0.7)
    })
})

describe("Hitbox entry", () => {
    test("a disk → where the line enters it, none when it misses or it lies behind", () => {
        const disk = new Disk(0.5)
        expect(disk.entry(at(0, 0), new Vector2(0, 4), UP)).toBeCloseTo(3.5)
        expect(disk.entry(at(2, 0), new Vector2(0, 4), UP)).toBeNull()
        expect(disk.entry(at(0, 0), new Vector2(0, -4), UP)).toBeNull()
        expect(disk.entry(at(0, 0), new Vector2(0, 0.2), UP)).toBe(0)
    })

    test("a box → where the line enters it, none when it misses or it lies behind", () => {
        const box = new Box(4, 1)
        expect(box.entry(at(0, 0, RIGHT), new Vector2(0, 4), UP)).toBeCloseTo(3.5)
        expect(box.entry(at(0, 0, RIGHT), new Vector2(3, 4), UP)).toBeNull()
        expect(box.entry(at(0, 0, RIGHT), new Vector2(0, -4), UP)).toBeNull()
        expect(box.entry(at(0, 0, RIGHT), new Vector2(-4, 0), RIGHT)).toBeCloseTo(2)
    })
})

describe("Hitbox saved", () => {
    test("a disk, a box → written and read back", () => {
        expect(loadedHitbox(new Disk(0.4).save())).toEqual(new Disk(0.4))
        expect(loadedHitbox(new Box(4, 0.4).save())).toEqual(new Box(4, 0.4))
    })

    test("an unknown shape → refused", () => {
        expect(() => loadedHitbox(["star", 3])).toThrow()
    })
})

describe("A wall of the scenery", () => {
    test("a walker → stops at the face of the wall, never inside", () => {
        const on = battle()
        wall(on, 3.5, 3)
        const walker = unit(on, 3.5, 5)
        const gone = on.moveSpot(walker, walker.position, UP, 3)
        // The wall is 0.4 thick: its face is at y = 3.2, and the walker stops a radius below.
        expect(gone.to.y).toBeGreaterThanOrEqual(3.2 + UNIT_RADIUS - 1e-9)
        expect(gone.to.y).toBeLessThan(3.2 + UNIT_RADIUS + 0.06)
        expect(gone.struck).toBeNull()
    })

    test("a walker past the end of the wall → goes by", () => {
        const on = battle()
        wall(on, 3.5, 3)
        // The wall spans x in 1.5..5.5: the walker passes the end at 6.2.
        const walker = unit(on, 6.2, 5)
        expect(on.moveSpot(walker, walker.position, UP, 3).distance).toBeCloseTo(3)
    })

    test("a walker along its length, touching → slides along without stopping", () => {
        const on = battle()
        wall(on, 3.5, 3)
        const walker = unit(on, 1, 3.6)
        expect(on.moveSpot(walker, walker.position, RIGHT, 2).distance).toBeCloseTo(2)
    })

    test("room → refused inside the wall, given beside it", () => {
        const on = battle()
        wall(on, 3.5, 3)
        expect(on.free(new Vector2(3.5, 3), null)).toBe(false)
        expect(on.free(new Vector2(2, 3), null)).toBe(false)
        expect(on.free(new Vector2(3.5, 4), null)).toBe(true)
    })

    test("a ray into the wall → stops on it, hitting nobody", () => {
        const on = battle()
        wall(on, 3.5, 3)
        const shooter = unit(on, 2, 6)
        const hit = on.ray(shooter, 6, { position: shooter.position, direction: UP })
        expect(hit.unit).toBeNull()
        expect(hit.end.y).toBeCloseTo(3.2)
    })

    test("walls of the scenery → one team of the scenery", () => {
        const on = battle()
        wall(on, 3.5, 3)
        wall(on, 3.5, 5)
        unit(on, 1, 1)
        expect(on.teams.filter(team => team.name === "Décor")).toHaveLength(1)
    })

    test("no room for a body of the scenery → told, not skipped", () => {
        const on = battle()
        unit(on, 3.5, 3)
        expect(() => wall(on, 3.5, 3)).toThrow(/no room/i)
    })

    test("saved and loaded back → the same wall, the same one team", () => {
        const on = battle()
        wall(on, 3.5, 3)
        unit(on, 1, 5)
        const loaded = Battle.restore(on.state())
        const loadedWall = loaded.units.find(each => each.name === "Mur")!
        expect(loadedWall.hitbox).toEqual(new Box(4, 0.4))
        expect(loadedWall.direction.equals(RIGHT)).toBe(true)
        expect(loaded.teams.filter(team => team.name === "Décor")).toHaveLength(1)
    })
})

describe("Hitbox edge", () => {
    test("a disk → its radius, whichever way", () => {
        expect(new Disk(0.35).edge(at(0, 0), UP)).toBeCloseTo(0.35)
        expect(new Disk(0.35).edge(at(0, 0), new Vector2(1, 1).normalized!)).toBeCloseTo(0.35)
    })

    test("a box → half its length ahead, half its width aside, further on the diagonal", () => {
        const ship = new Box(3.2, 1.2)
        expect(ship.edge(at(0, 0, RIGHT), RIGHT)).toBeCloseTo(1.6)
        expect(ship.edge(at(0, 0, RIGHT), Vector2.LEFT)).toBeCloseTo(1.6)
        expect(ship.edge(at(0, 0, RIGHT), UP)).toBeCloseTo(0.6)
        const diagonal = new Vector2(1, 1).normalized!
        // A diagonal leaves through the long side, 0.6 m across: 0.6 / sin 45°.
        expect(ship.edge(at(0, 0, RIGHT), diagonal)).toBeCloseTo(0.6 * Math.SQRT2)
    })

    test("a box turned → the edge turns with it", () => {
        expect(new Box(3.2, 1.2).edge(at(0, 0, UP), UP)).toBeCloseTo(1.6)
        expect(new Box(3.2, 1.2).edge(at(0, 0, UP), RIGHT)).toBeCloseTo(0.6)
    })

    test("a unit → its muzzle lies on its edge, in the way it goes", () => {
        const on = battle()
        const walker = unit(on, 3, 3, { direction: RIGHT })
        expect(walker.muzzle().x).toBeCloseTo(3 + UNIT_RADIUS)
        expect(walker.muzzle(walker, Vector2.LEFT).x).toBeCloseTo(3 - UNIT_RADIUS)
        const ship = on.add({
            name: "Bateau", team: MONSTERS, controller: "bot", position: new Vector2(3, 5), direction: RIGHT,
            hearts: [new Heart(SOLID_HEART)], decks: [], hitbox: new Box(3.2, 1.2), decisive: false,
        })
        expect(ship.muzzle().x).toBeCloseTo(3 + 1.6)
        // Turned up in a preview, its length lies up: the bow is 1.6 m above the middle.
        expect(ship.muzzle(at(3, 5, UP)).y).toBeCloseTo(5 - 1.6)
    })
})

describe("Hitbox grown", () => {
    test("a disk → a circle as far from its edge as the margin", () => {
        const zone = new Disk(0.35).grown(at(2, 2), 1)
        expect(Areas.checkPoint(zone, new Vector2(2 + 1.3, 2))).toBe(true)
        expect(Areas.checkPoint(zone, new Vector2(2 + 1.4, 2))).toBe(false)
    })

    test("a box → the margin from each side, rounded at the corners", () => {
        const zone = new Box(3.2, 1.2).grown(at(0, 0, RIGHT), 1)
        // Ahead: 1.6 + 1, aside: 0.6 + 1.
        expect(Areas.checkPoint(zone, new Vector2(2.5, 0))).toBe(true)
        expect(Areas.checkPoint(zone, new Vector2(2.7, 0))).toBe(false)
        expect(Areas.checkPoint(zone, new Vector2(0, 1.5))).toBe(true)
        expect(Areas.checkPoint(zone, new Vector2(0, 1.7))).toBe(false)
        // The corner is rounded: further than the margin from the box, in the square beyond its corner.
        expect(Areas.checkPoint(zone, new Vector2(2.55, 1.55))).toBe(false)
    })

    test("no margin → the outline of the body", () => {
        const zone = new Box(3.2, 1.2).grown(at(0, 0, RIGHT), 0)
        expect(Areas.checkPoint(zone, new Vector2(1.5, 0.5))).toBe(true)
        expect(Areas.checkPoint(zone, new Vector2(1.7, 0))).toBe(false)
    })
})

describe("Blows from the edge of the body", () => {
    /** A ship of the monsters, 3.2 m by 1.2, facing right, with a unit of the heroes in front. */
    function ship(on: Battle) {
        return on.add({
            name: "Bateau", team: MONSTERS, controller: "bot", position: new Vector2(1.5, 3), direction: RIGHT,
            hearts: [new Heart(SOLID_HEART)], decks: [], hitbox: new Box(3.2, 1.2), decisive: false,
        })
    }

    test("a slash of a standard body → the same reach as it ever had, from its center", () => {
        const on = battle()
        const walker = unit(on, 3, 3, { direction: RIGHT })
        const area = SLASH.reach(on, walker, walker, 1)
        // 1.3 m from the center was its reach: just inside, just outside.
        const far = new Vector2(3 + 1.25, 3)
        const beyond = new Vector2(3 + 1.35, 3)
        expect(Areas.checkPoint(area, far)).toBe(true)
        expect(Areas.checkPoint(area, beyond)).toBe(false)
    })

    test("a slash of a ship → starts at its bow, not in its hull", () => {
        const on = battle()
        const boat = ship(on)
        const area = SLASH.reach(on, boat, boat, 1)
        // The bow is 1.6 m ahead of the middle; the slash goes a body radius less than 1.3 m from there.
        expect(area[0].x).toBeCloseTo(1.5 + 1.6)
        expect(Areas.checkPoint(area, new Vector2(1.5 + 1.6 + 1.25 - UNIT_RADIUS, 3))).toBe(true)
        expect(Areas.checkPoint(area, new Vector2(1.5 + 1.6 + 1.35 - UNIT_RADIUS, 3))).toBe(false)
    })

    test("a sweep of a ship → around its hull, not around its middle", () => {
        const on = battle()
        const boat = ship(on)
        const area = SWEEP.reach(on, boat, boat, 1)
        // 1.2 - UNIT_RADIUS from the hull: aside, the hull is 0.6 m, ahead 1.6 m.
        expect(Areas.checkPoint(area, new Vector2(1.5, 3 + 0.6 + 1.1 - UNIT_RADIUS))).toBe(true)
        expect(Areas.checkPoint(area, new Vector2(1.5, 3 + 0.6 + 1.3 - UNIT_RADIUS))).toBe(false)
        expect(Areas.checkPoint(area, new Vector2(1.5 + 1.6 + 1.1 - UNIT_RADIUS, 3))).toBe(true)
    })

    test("a shot of a ship → leaves from its bow, and stops on what it meets", () => {
        const on = battle()
        const boat = ship(on)
        const target = unit(on, 1.5 + 1.6 + 2, 3)
        const hit = on.ray(boat, 6, boat)
        expect(hit.start.x).toBeCloseTo(1.5 + 1.6)
        expect(hit.unit).toBe(target)
    })

    test("a projection of a ship → reaches the unit lying against its bow", () => {
        const on = battle()
        const boat = ship(on)
        const against = unit(on, 1.5 + 1.6 + 0.5, 3)
        const area = PROJECTION.get().preview({ battle: on, unit: boat, pose: boat }).indicators
        expect(area.length).toBeGreaterThan(0)
        expect(on.fetch(Areas.arc(boat.muzzle(), boat.direction, 1.5 - UNIT_RADIUS, Math.SQRT1_2), boat)).toContain(against)
    })
})

describe("Turning a body that is not round", () => {
    /** A long box, 3 m by 0.6, of the monsters, facing right. */
    function rod(on: Battle, x: number, y: number) {
        return on.add({
            name: "Tige", team: MONSTERS, controller: "bot", position: new Vector2(x, y), direction: RIGHT,
            hearts: [new Heart(SOLID_HEART)], decks: [], hitbox: new Box(3, 0.6), decisive: false,
        })
    }

    test("room all around → turns where it stands", () => {
        const on = battle()
        const body = rod(on, 3.5, 3.5)
        unit(on, 0.5, 0.5)
        on.turn(body, UP)
        expect(body.direction.equals(UP)).toBe(true)
        expect(body.position.equals(new Vector2(3.5, 3.5))).toBe(true)
    })

    test("a turn into a body → refused, it keeps its direction", () => {
        const on = battle()
        const body = rod(on, 3.5, 3.5)
        // Facing up the rod would reach 1.5 m above its middle: a unit there is in its way.
        const blocker = unit(on, 3.5, 2.3)
        on.turn(body, UP)
        expect(body.direction.equals(RIGHT)).toBe(true)
        expect(blocker.position.equals(new Vector2(3.5, 2.3))).toBe(true)
    })

    test("a turn into a wall of the arena → pushed back in, then turned", () => {
        const on = battle()
        const body = rod(on, 3.5, 0.6)
        // Facing up it is 3 m long: it would reach 0.9 m beyond the top wall.
        on.turn(body, UP)
        expect(body.direction.equals(UP)).toBe(true)
        expect(body.position.y).toBeGreaterThanOrEqual(1.5 - 1e-9)
    })

    test("a round body → always turns, wherever it stands", () => {
        const on = battle()
        const walker = unit(on, 0.35, 0.35)
        unit(on, 0.9, 0.35, { team: MONSTERS })
        on.turn(walker, RIGHT)
        expect(walker.direction.equals(RIGHT)).toBe(true)
        expect(walker.position.equals(new Vector2(0.35, 0.35))).toBe(true)
    })
})

describe("A body that is not bounded", () => {
    test("steps through the wall of the arena, and is gone once wholly outside at the end of the round", () => {
        const on = new Battle(new Arena(7, 7), 1)
        const hero = unit(on, 3.5, 5)
        unit(on, 6.5, 6.5, { team: MONSTERS })
        const ship = on.place(null, {
            name: "Bateau", sprite: visual("units/pillar"), at: new Vector2(1, 3), direction: Vector2.LEFT,
            hearts: [new Heart(SOLID_HEART)], tangible: false, targetable: false, bounded: false,
            cards: [STEP, STEP, STEP, STEP],
        })!
        play(on, [[hero, chain()]])
        // Four steps of 2 m from x = 1 going left: it left the arena, and is gone.
        expect(on.units.includes(ship)).toBe(false)
    })

    test("a bounded body → stops at the wall as before", () => {
        const on = battle()
        const walker = unit(on, 0.35, 3, { direction: Vector2.LEFT })
        expect(on.moveSpot(walker, walker.position, Vector2.LEFT, 2).distance).toBeCloseTo(0)
    })
})

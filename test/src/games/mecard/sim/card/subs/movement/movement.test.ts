import { describe, expect, test } from "vitest"
import {
    Arena, ASSASSIN_STEP, Battle, EXPLOSIVE_DASH, GRAPPLE, HAZARD_COLOR, Heart, LASSO, RANDOM_AIM,
    RANGE_COLOR, RED_HEART, ROOTED, STURDY_AIM, SWAP, Vector2, VINE,
} from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../../../fixtures"

/** A battle on an arena of 7 by 7 with one pillar at its middle. */
function pillared(): Battle {
    return new Battle(new Arena(7, 7, [{ center: new Vector2(3.5, 2), radius: 0.5 }]), 1)
}

/** Two full red hearts. */
function twoHearts(): Heart[] {
    return Heart.many(RED_HEART, 4)
}

// --- Tests ---

describe("LASSO", () => {
    test("a unit ahead → pulled to the caster, facing as it did", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const caught = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.RIGHT })
        play(on, [[caster, chain(LASSO)]])
        expect(caught.position.distance(caster.position)).toBeCloseTo(0.75, 1)
        expect(caught.direction).toEqual(Vector2.RIGHT)
        expectAt(caster, 3, 6)
    })

    test("only a pillar ahead → nothing moves", () => {
        const on = pillared()
        const caster = unit(on, 3.5, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[caster, chain(LASSO)]])
        expectAt(caster, 3.5, 5)
    })
})

describe("GRAPPLE", () => {
    test("a pillar ahead → the caster pulled to it", () => {
        const on = pillared()
        const caster = unit(on, 3.5, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[caster, chain(GRAPPLE)]])
        expect(caster.position.y).toBeCloseTo(2 + 0.5 + 0.35, 1)
    })

    test("a unit ahead → the caster pulled to it, the unit left where it stands", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const caught = unit(on, 3, 3, { team: MONSTERS })
        play(on, [[caster, chain(GRAPPLE)]])
        expectAt(caught, 3, 3)
        expect(caster.position.distance(caught.position)).toBeCloseTo(0.75, 1)
    })

    test("nothing in reach → nothing moves", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[caster, chain(GRAPPLE)]])
        expectAt(caster, 3, 6)
    })
})

describe("VINE", () => {
    test("a unit ahead → pulled and rooted", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const caught = unit(on, 3, 3, { team: MONSTERS })
        on.startRound()
        caster.hand.push(VINE)
        on.commit(caster, chain(VINE))
        on.endPreparation()
        on.tick()
        for(let i = 0; i < 200 && caught.statusOf(ROOTED) === undefined; i++) on.tick()
        expect(caught.statusOf(ROOTED)).toBeDefined()
        expect(caught.position.distance(caster.position)).toBeCloseTo(0.75, 1)
    })

    test("a pillar ahead → the caster pulled to it", () => {
        const on = pillared()
        const caster = unit(on, 3.5, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[caster, chain(VINE)]])
        expect(caster.position.y).toBeLessThan(3)
    })
})

describe("aims", () => {
    test("the sturdiest → the enemy holding the most halves, not the closest", () => {
        const on = battle()
        const aimer = unit(on, 3, 6)
        unit(on, 3, 5, { team: MONSTERS, hearts: [new Heart(RED_HEART)] })
        const sturdy = unit(on, 6, 6, { team: MONSTERS, hearts: twoHearts() })
        play(on, [[aimer, chain(STURDY_AIM)]])
        const toward = sturdy.position.minus(aimer.position).normalized
        expect(aimer.direction.x).toBeCloseTo(toward?.x ?? 0)
    })

    test("at random → turned at one of the enemies in reach, its preview saying it cannot know", () => {
        const on = battle()
        const aimer = unit(on, 3, 6)
        unit(on, 1, 6, { team: MONSTERS })
        unit(on, 5, 6, { team: MONSTERS })
        const [root] = chain(RANDOM_AIM).preview(on, aimer, false)
        expect(root.preview?.indicators.some(each => each.kind === "label" && each.text === "au hasard")).toBe(true)
        play(on, [[aimer, chain(RANDOM_AIM)]])
        expect(Math.abs(aimer.direction.x)).toBeCloseTo(1)
    })
})

describe("ASSASSIN_STEP", () => {
    test("an enemy in vision → in its back, facing its way", () => {
        const on = battle()
        const assassin = unit(on, 1, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.RIGHT })
        play(on, [[assassin, chain(ASSASSIN_STEP)]])
        expect(assassin.position.x).toBeLessThan(target.position.x)
        expect(assassin.position.y).toBeCloseTo(3)
        expect(assassin.direction).toEqual(Vector2.RIGHT)
    })
})

describe("SWAP", () => {
    test("a unit in vision → places swapped", () => {
        const on = battle()
        const swapper = unit(on, 3, 6)
        const other = unit(on, 3, 4, { team: MONSTERS })
        play(on, [[swapper, chain(SWAP)]])
        expectAt(swapper, 3, 4)
        expectAt(other, 3, 6)
    })
})

describe("EXPLOSIVE_DASH", () => {
    test("into a pillar → a blast around, the dasher spared", () => {
        const on = pillared()
        const dasher = unit(on, 3.5, 5)
        const near = unit(on, 4.6, 3, { team: MONSTERS, hearts: twoHearts() })
        play(on, [[dasher, chain(EXPLOSIVE_DASH)]])
        expect(dasher.life).toBe(4)
        expect(near.life).toBe(2)
    })

    test("into nothing → no blast", () => {
        const on = battle()
        const dasher = unit(on, 3.5, 6)
        const far = unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[dasher, chain(EXPLOSIVE_DASH)]])
        expect(far.life).toBe(4)
    })

    test("into nothing, someone beside its end → no blast", () => {
        const on = battle()
        const dasher = unit(on, 3.5, 6)
        const beside = unit(on, 4.5, 3, { team: MONSTERS })
        play(on, [[dasher, chain(EXPLOSIVE_DASH)]])
        expect(beside.life).toBe(4)
    })

    test("its preview, nothing in the way → the zone at the end of the dash, as a reach", () => {
        const on = battle()
        const dasher = unit(on, 3.5, 6)
        const [root] = chain(EXPLOSIVE_DASH).preview(on, dasher, false)
        const [zone] = root.preview?.indicators ?? []
        expect(zone).toMatchObject({ kind: "polygon", color: RANGE_COLOR })
    })

    test("its preview, into a pillar → the zone as a hazard", () => {
        const on = pillared()
        const dasher = unit(on, 3.5, 5)
        const [root] = chain(EXPLOSIVE_DASH).preview(on, dasher, false)
        const [zone] = root.preview?.indicators ?? []
        expect(zone).toMatchObject({ kind: "polygon", color: HAZARD_COLOR })
    })
})

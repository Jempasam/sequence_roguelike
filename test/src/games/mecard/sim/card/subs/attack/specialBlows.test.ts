import { describe, expect, test } from "vitest"
import {
    Arena, ASSASSIN_BLOW, ASSASSINATION, Battle, BLOOD_AXE, BOUNCING_BOW, CROSSBOW, HARPOON, Heart,
    MEGA_SLASH,
    RED_HEART, SCYTHE, SKULL_BREAK, STEP, TACKLE, Vector2,
} from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../../../fixtures"

/** Hearts enough to count every one lost. */
function sturdy(): Heart[] {
    return Heart.many(RED_HEART, 12)
}

/** How many hearts a unit of {@link sturdy} hearts lost. */
function lost(target: Unit): number {
    return 12 - target.life
}

/** Empty hearts of a unit, from the last. */
function wound(target: Unit, count: number): void {
    for(const heart of target.hearts.all.slice(-count)) heart.isEmpty = true
}

// --- Tests ---

describe("SKULL_BREAK", () => {
    test("a unit on each side → both wounded and stunned", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        const left = unit(on, 2, 3, { team: MONSTERS, hearts: sturdy() })
        const right = unit(on, 4, 3, { team: MONSTERS, hearts: sturdy() })
        on.startRound()
        hero.hand.push(SKULL_BREAK)
        on.commit(hero, chain(SKULL_BREAK))
        on.endPreparation()
        const stunned: string[] = []
        for(let tick = 0; tick < 200 && on.executing; tick++){
            on.tick()
            if(left.steps.length > 0) stunned.push("gauche")
            if(right.steps.length > 0) stunned.push("droite")
        }
        expect(lost(left)).toBe(2)
        expect(lost(right)).toBe(2)
        expect(stunned).toContain("gauche")
        expect(stunned).toContain("droite")
    })

    test("a unit on one side only → wounded, not stunned", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        const right = unit(on, 4, 3, { team: MONSTERS, hearts: sturdy() })
        const events = on.events
        play(on, [[hero, chain(SKULL_BREAK)]])
        expect(lost(right)).toBe(2)
        expect(events.some(event => event.type === "status" && event.text === "étourdi")).toBe(false)
    })

    test("a unit ahead → out of reach", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        const ahead = unit(on, 3, 2, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(SKULL_BREAK)]])
        expect(lost(ahead)).toBe(0)
    })
})

describe("MEGA_SLASH", () => {
    test("goes through every body on its way, each wounded", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const first = unit(on, 3, 5, { team: MONSTERS, hearts: sturdy() })
        const second = unit(on, 3, 4, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(MEGA_SLASH)]])
        expectAt(hero, 3, 3)
        expect(lost(first)).toBe(1)
        expect(lost(second)).toBe(1)
        expect(hero.life).toBe(4)
    })

    test("landing in a body → thrown aside for a heart", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 3, 3, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(MEGA_SLASH)]])
        expect(hero.life).toBe(3)
        expect(on.free(hero.position, hero)).toBe(true)
    })

    test("going past a wall → back within the walls, for one heart", () => {
        const on = battle()
        const hero = unit(on, 3, 1)
        unit(on, 6, 6, { team: MONSTERS })
        play(on, [[hero, chain(MEGA_SLASH)]])
        expect(hero.life).toBe(3)
        expect(on.arena.inside(hero.position, hero.radius)).toBe(true)
    })
})

describe("ASSASSINATION", () => {
    test("a kill → what was played so far plays again, itself included", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const doomed = unit(on, 3, 4, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        const next = unit(on, 3, 2, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(STEP, ASSASSINATION)]])
        expect(doomed.alive).toBe(false)
        expect(next.alive).toBe(false)
    })

    test("no kill → played once", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const target = unit(on, 3, 4, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
        play(on, [[hero, chain(STEP, ASSASSINATION)]])
        expect(lost(target)).toBe(2)
    })

    test("each kill plays the chain once: what it replays never piles up", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const victims = [4.8, 3.8, 2.8, 1.8].map(y => {
            return unit(on, 3, y, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        })
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        hero.hand.push(ASSASSINATION)
        on.commit(hero, chain(ASSASSINATION))
        on.endPreparation()
        let most = 0
        for(let tick = 0; tick < 500 && on.executing; tick++){
            on.tick()
            most = Math.max(most, hero.steps.length)
        }
        expect(victims[0].alive).toBe(false)
        expect(most).toBeLessThanOrEqual(1)
    })
})

describe("ASSASSIN_BLOW", () => {
    test("a feverish unit → twice the damage", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
        wound(target, 7)
        expect(target.feverish).toBe(true)
        play(on, [[hero, chain(ASSASSIN_BLOW)]])
        expect(target.life).toBe(1)
    })

    test("feverish and in the back → four times the damage", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const hearts = Heart.many(RED_HEART, 24)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts, direction: Vector2.UP })
        wound(target, 13)
        play(on, [[hero, chain(ASSASSIN_BLOW)]])
        expect(target.life).toBe(11 - 8)
    })

    test("a healthy unit → the damage of a dagger", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
        play(on, [[hero, chain(ASSASSIN_BLOW)]])
        expect(lost(target)).toBe(2)
    })
})

describe("HARPOON", () => {
    test("a hit → a wound, and the unit pulled toward the target", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const target = unit(on, 3, 2.5, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(HARPOON)]])
        expect(lost(target)).toBe(1)
        expectAt(hero, 3, 4)
    })

    test("a pull stops on the body it runs into", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(HARPOON)]])
        expect(hero.position.distance(target.position)).toBeGreaterThanOrEqual(2 * hero.radius)
    })

    test("nothing met → the unit stays", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(HARPOON)]])
        expectAt(hero, 3, 6)
    })
})

describe("SCYTHE", () => {
    test("a body at the end of the blade → wounded", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const target = unit(on, 3, 3.5, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(SCYTHE)]])
        expect(lost(target)).toBe(1)
    })

    test("a body close by → under the blade", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const target = unit(on, 3, 4.75, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(SCYTHE)]])
        expect(lost(target)).toBe(0)
    })
})

describe("BLOOD_AXE", () => {
    test("each unit hit fills a heart of its unit again", () => {
        const on = battle()
        const hero = unit(on, 3, 3, { hearts: sturdy() })
        wound(hero, 5)
        unit(on, 3, 2.2, { team: MONSTERS, hearts: sturdy() })
        unit(on, 3, 3.8, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(BLOOD_AXE)]])
        expect(hero.life).toBe(9)
    })
})

describe("BOUNCING_BOW", () => {
    test("each bounce gives it its whole range back", () => {
        const on = new Battle(new Arena(7, 3), 1)
        const hero = unit(on, 3, 2, { direction: Vector2.UP })
        const [root] = chain(BOUNCING_BOW).preview(on, hero)
        expect(root.preview?.indicators).toHaveLength(3)
    })

    test("a target farther from the wall than what the shot had left → hit all the same", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3, { direction: Vector2.RIGHT })
        const target = unit(on, 2.2, 3, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(BOUNCING_BOW)]])
        expect(lost(target)).toBe(1)
    })
})

describe("CROSSBOW", () => {
    test("goes through the first body, and stops on the second", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const first = unit(on, 3, 5, { team: MONSTERS, hearts: sturdy() })
        const second = unit(on, 3, 4, { team: MONSTERS, hearts: sturdy() })
        const third = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(CROSSBOW)]])
        expect([first, second, third].map(lost)).toEqual([1, 1, 0])
    })
})

describe("TACKLE", () => {
    test("a unit touched → its back turned to the tackler, and wounded", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const target = unit(on, 3, 3.2, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
        play(on, [[hero, chain(TACKLE)]])
        expect(target.direction.equals(Vector2.UP)).toBe(true)
        expect(lost(target)).toBe(1)
    })
})

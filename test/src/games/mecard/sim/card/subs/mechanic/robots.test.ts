import { describe, expect, test } from "vitest"
import {
    AIM, BOW_MODULE, BULL, Heart, IMPROVISED_ROBOT, IMPROVISED_WEAPON, KAMIKAZE_ROBOT, MECHANIC_KIT,
    PATH_AIM,
    MISSILE, RAM, REPEATER,
    RED_HEART, resolve, saveBattle, loadBattle, SHIELD_HEART, SHOT, STONE_GOLEM, TANK_ROBOT, THRUST, WAIT,
} from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

/** The robot of a battle, none when none. */
function robotOf(on: ReturnType<typeof battle>): Unit {
    const robot = on.units.find(body => body.sprite?.visual === "units/robot")
    if(!robot) throw new Error("No robot was built.")
    return robot
}

// --- Tests ---

describe("IMPROVISED_ROBOT", () => {
    test("builds a robot ahead, facing as its unit, with shield hearts only", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 3, 1, { team: MONSTERS })
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        const robot = robotOf(on)
        expect(robot.position.y).toBeCloseTo(4)
        expect(robot.direction.equals(hero.direction)).toBe(true)
        expect(robot.hearts.all.map(heart => heart.kind)).toEqual([SHIELD_HEART, SHIELD_HEART])
        expect(robot.team).toBe(hero.team)
    })

    test("its summoning stat adds hearts", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        hero.stats.summon.base = 1
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        expect(robotOf(on).life).toBe(3)
    })

    test("plays its module the round it comes, then each round after its owner", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const foe = unit(on, 3, 1, { team: MONSTERS, hearts: Heart.many(RED_HEART, 12) })
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        expect(foe.life).toBe(11)
        expect(on.initiative.indexOf(robotOf(on))).toBe(on.initiative.indexOf(hero) + 1)
        play(on, [])
        expect(foe.life).toBe(10)
    })

    test("comes back from a save, its deck in order", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const foe = unit(on, 3, 1, { team: MONSTERS, hearts: Heart.many(RED_HEART, 12) })
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        const again = loadBattle(saveBattle(on))
        play(again, [])
        expect(again.units[1].life).toBe(foe.life - 1)
    })

    test("no room ahead → nothing built", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        expect(on.units.some(body => body.sprite?.visual === "units/robot")).toBe(false)
    })
})

describe("TANK_ROBOT", () => {
    test("twice the hearts, a wait between each card", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(TANK_ROBOT, BOW_MODULE)]])
        const robot = robotOf(on)
        expect(robot.life).toBe(4)
        const deck = [...robot.decks.all[0].discard, ...robot.hand, ...robot.decks.all[0].pile]
        expect(deck).toEqual(expect.arrayContaining([AIM, WAIT, SHOT]))
    })
})

describe("IMPROVISED_WEAPON", () => {
    test("becomes the cards of the module on its right", () => {
        const { cards } = resolve([IMPROVISED_WEAPON, MISSILE], { pick: options => options[0] })
        expect(cards.map(card => card.name)).toEqual(MISSILE.cards.map(card => card.name))
        expect(cards).toContain(THRUST)
    })

    test("anything else on its right → nothing", () => {
        const { cards } = resolve([IMPROVISED_WEAPON, THRUST], { pick: options => options[0] })
        expect(cards).toEqual([THRUST])
    })

    test("a part that needs a module on its right, with no module → nothing, no error", () => {
        const { cards } = resolve([IMPROVISED_WEAPON, REPEATER], { pick: options => options[0] })
        expect(cards).toEqual([REPEATER])
    })

    test("a part, then a module → the weapon still gets nothing from the part", () => {
        expect(() => resolve([IMPROVISED_WEAPON, REPEATER, MISSILE], { pick: options => options[0] })).not.toThrow()
    })
})

describe("RAM", () => {
    test("wounds the unit it runs into", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const foe = unit(on, 3, 3, { team: MONSTERS, hearts: Heart.many(RED_HEART, 6) })
        play(on, [[hero, chain(RAM)]])
        expect(foe.life).toBe(4)
    })
})

describe("the new monsters", () => {
    test("the bull plays its three rounds, four cards each", () => {
        expect(BULL.draw).toBe(4)
        expect(BULL.cards.length).toBe(12)
        expect(BULL.cards.slice(0, 4)).toEqual([PATH_AIM, RAM, WAIT, WAIT])
    })

    test("the stone golem is twice the body", () => {
        expect(STONE_GOLEM.size).toBe(2)
    })

    test("a kamikaze robot blows itself up on its last card", () => {
        expect(KAMIKAZE_ROBOT.cards.at(-1)?.name).toBe("Kamikaze")
    })

    test("the mechanic builds with modules", () => {
        expect(MECHANIC_KIT.cards).toContain(IMPROVISED_ROBOT)
        expect(MECHANIC_KIT.cards).toContain(MISSILE)
    })
})

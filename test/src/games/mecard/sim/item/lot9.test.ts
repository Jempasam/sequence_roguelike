import { describe, expect, test } from "vitest"
import {
    BACK_EYES, BLOOD_PACT, BLUE_HEART, CELL, CHIPPED_BLADE, DEMON_FANG, DEMONIC, ECHO_ITEM, FISHER_GLOVE, GEAR,
    GLASS_CORE, GLASS_HEART, Heart, HOURGLASS, BLEEDING, IMPROVISED_ROBOT, BOW_MODULE, LEASH, MAGNET, RED_HEART,
    ROSARY, SCARY_MASK, STICKY_SOLES, SUCTION, SUMMON_HEART, THRUST, TORERO_CAPE, UNSTABLE_REACTOR, WAIT,
    CONCENTRATED, THRUST_CHARGE, SHIELD_HEART, STEP, Concentration, TURRET,
} from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Tests ---

describe("BACK_EYES", () => {
    function struckFrom(degrees: number): boolean {
        const on = battle()
        const holder = unit(on, 3.5, 3.5)
        const attacker = unit(on, 3.5 + Math.sin(degrees * Math.PI / 180) * 1.5, 3.5 - Math.cos(degrees * Math.PI / 180) * 1.5, {
            team: MONSTERS,
        })
        on.equip(holder, BACK_EYES)
        on.strike(attacker, { kind: "circle", center: holder.position, radius: 0.2 }, 1, "physical")
        return holder.direction.y > 0
    }

    test("an attacker at 129° from the front → nothing; at 131° → turns around", () => {
        expect(struckFrom(129)).toBe(false)
        expect(struckFrom(131)).toBe(true)
    })
})

describe("STICKY_SOLES", () => {
    test("halves what the suction makes it go", () => {
        const on = battle()
        const sucker = unit(on, 3.5, 1.5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        on.equip(foe, STICKY_SOLES)
        play(on, [[sucker, chain(SUCTION)]])
        // 2.5 meters to go, 1.25 with the soles.
        expect(foe.position.y).toBeCloseTo(2.75, 1)
    })
})

describe("TORERO_CAPE", () => {
    test("a charge through its unit stuns the charger", () => {
        const on = battle()
        const charger = unit(on, 3.5, 6)
        const holder = unit(on, 3.5, 5, { team: MONSTERS })
        on.equip(holder, TORERO_CAPE)
        let stuns = 0
        on.events.push = new Proxy(on.events.push, {
            apply: (target, self, args: unknown[]) => {
                if((args[0] as { text?: unknown }).text === "étourdi") stuns++
                return Reflect.apply(target, self, args)
            },
        })
        play(on, [[charger, chain(THRUST_CHARGE)]])
        expect(stuns).toBe(1)
    })
})

describe("kills and waits", () => {
    test("demon fang gives energy, glove gives gold, rosary gives concentration on a wait", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.3, { team: MONSTERS })
        unit(on, 1, 1, { team: MONSTERS })
        on.equip(hero, DEMON_FANG)
        on.equip(hero, FISHER_GLOVE)
        on.equip(hero, ROSARY)
        foe.hearts.damage(3, "physical", null)
        let gold = 0
        on.onGetGold.add(({ amount }) => { gold += amount })
        const given: unknown[] = []
        on.signals.statusAdded.add(({ type }) => given.push(type))
        play(on, [[hero, chain(THRUST, WAIT)]])
        expect(foe.alive).toBe(false)
        expect(gold).toBe(2)
        expect(given).toContain(DEMONIC)
        expect(given).toContain(CONCENTRATED)
    })
})

describe("hearts", () => {
    test("glass core gives two glass hearts", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        on.equip(hero, GLASS_CORE)
        expect(hero.hearts.all.filter(heart => heart.kind === GLASS_HEART)).toHaveLength(2)
    })

    test("unstable reactor ignores red hearts, bursts on a blue one", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5, { hearts: [...Heart.many(RED_HEART, 3), ...Heart.many(BLUE_HEART, 1)] })
        const foe = unit(on, 3.5, 4.3, { team: MONSTERS })
        on.equip(hero, UNSTABLE_REACTOR)
        hero.hearts.damage(1, "physical", null)
        expect(foe.life).toBe(3)
        hero.hearts.damage(1, "physical", null)
        expect(foe.life).toBe(3)
    })

    test("blood pact gives a point of strength per missing heart", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const base = hero.stats.strength.value
        on.equip(hero, BLOOD_PACT)
        hero.hearts.damage(2, "physical", null)
        expect(hero.stats.strength.value).toBe(base + 2)
    })

    test("hourglass keeps a positive status a round out of two", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        on.equip(hero, HOURGLASS)
        on.applyStatus(hero, new Concentration(3))
        play(on, [[hero, chain(STEP)]])
        // The first round is the one it keeps: 3 left, none lost.
        expect((hero.statuses.get(CONCENTRATED) as Concentration).rounds).toBe(3)
    })
})

describe("echo", () => {
    test("the last step plays once more, once", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        on.equip(hero, ECHO_ITEM)
        play(on, [[hero, chain(THRUST)]])
        expect(foe.life).toBe(0)
    })
})

describe("summons", () => {
    test("gear and leash act on the robot, summon heart on a body going away", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 1, 1, { team: MONSTERS })
        on.equip(hero, GEAR)
        on.equip(hero, CELL)
        on.equip(hero, LEASH)
        on.equip(hero, SUMMON_HEART)
        const bodies: ReturnType<typeof unit>[] = []
        on.signals.spawned.add(({ unit: body }) => bodies.push(body))
        play(on, [[hero, chain(IMPROVISED_ROBOT, BOW_MODULE)]])
        expect(bodies).toHaveLength(1)
        expect(bodies[0].hearts.all.filter(heart => heart.kind === SHIELD_HEART)).toHaveLength(3)
    })

    test("cell adds a time heart to a turret", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 1, 1, { team: MONSTERS })
        on.equip(hero, CELL)
        const hearts: number[] = []
        on.signals.spawned.add(({ unit: body }) => hearts.push(body.hearts.maxHearts))
        play(on, [[hero, chain(TURRET)]])
        expect(hearts).toEqual([3])
    })
})

describe("scary mask, magnet, chipped blade", () => {
    test("mask turns the units around away from its unit at the start of a round", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        const foe = unit(on, 4.5, 3.5, { team: MONSTERS })
        on.equip(hero, SCARY_MASK)
        play(on, [[hero, chain(WAIT)]])
        play(on, [[hero, chain(WAIT)]])
        expect(foe.direction.x).toBeGreaterThan(0.9)
    })

    test("magnet pulls the units around by half a meter", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        const foe = unit(on, 3.5, 6, { team: MONSTERS })
        on.equip(hero, MAGNET)
        play(on, [[hero, chain(WAIT)]])
        play(on, [[hero, chain(WAIT)]])
        expect(foe.position.y).toBeLessThan(6)
    })

    test("chipped blade makes the first unit hit bleed", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.3, { team: MONSTERS })
        on.equip(hero, CHIPPED_BLADE)
        const given: unknown[] = []
        on.signals.statusAdded.add(({ type }) => given.push(type))
        play(on, [[hero, chain(THRUST)]])
        expect(given).toContain(BLEEDING)
        expect(foe.life).toBeLessThan(4)
    })
})

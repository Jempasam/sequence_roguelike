import { describe, expect, test } from "vitest"
import {
    ARMOR_PLATING, BOW_MODULE, CHARGED_SHOT, DELAYED_CHARGE, HOMING_HEAD, IMPROVISED_ROBOT, INVERTER, MIRROR,
    MODULE_CORE, MODULE_MIXER, ModuleCard, RECYCLING, REPEATER, SPYGLASS_CARD, THRUST, THRUSTERS, TURBO, WAIT,
} from "@game/core/mecard"
import type { Card, Module, Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Fixture builders ---

/** The cards a module reads as, drawing the first option each time. */
function read(module: Module): readonly Card[] {
    return module.cards(options => options[0])
}

// --- Tests ---

describe("module modifiers", () => {
    const base = BOW_MODULE.get()

    test("thrusters, plating, core, recycling, repeater, inverter → the cards they say", () => {
        const names = (module: Module) => read(module).map(card => card.name)
        expect(names(base)).toEqual(["Viser", "Tir"])
        expect(names(THRUSTERS.get(base))).toEqual(["Avancer", "Viser", "Tir"])
        expect(names(ARMOR_PLATING.get(base))).toEqual(["Viser", "Tir", "Blocage"])
        expect(names(MODULE_CORE.get(base))).toEqual(["Blocage", "Viser", "Tir"])
        expect(names(RECYCLING.get(base))).toEqual(["Tir"])
        expect(names(REPEATER.get(base))).toEqual(["Viser", "Tir", "Tir"])
        expect(names(INVERTER.get(base))).toEqual(["Tir", "Viser"])
    })

    test("homing head puts an aim before each attack, turbo turns steps into charges", () => {
        const names = (module: Module) => read(module).map(card => card.name)
        const attack = new ModuleCard("Épée", [THRUST]).get()
        expect(names(HOMING_HEAD.get(attack))).toEqual(["Viser", "Estoc"])
        expect(names(TURBO.get(THRUSTERS.get(base)))).toEqual(["Charge d'estoc", "Viser", "Tir"])
    })

    test("the mixer draws each card with the chance it is given", () => {
        const mixed = MODULE_MIXER.get(base).cards(options => options[options.length - 1])
        expect(mixed.map(card => card.name)).toEqual(["Tir", "Viser"])
    })

    test("plating gives its robot a heart", () => {
        const on = battle()
        const builder = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const spawned: Unit[] = []
        on.signals.spawned.add(({ unit: body }) => spawned.push(body))
        play(on, [[builder, chain(IMPROVISED_ROBOT, ARMOR_PLATING, BOW_MODULE)]])
        // The robot of a module has two shields, and the plating one more.
        expect(spawned).toHaveLength(1)
        expect(spawned[0].hearts.maxHearts).toBe(3)
    })
})

describe("wrappers", () => {
    test("mirror plays its action, turns around, and plays it again", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        const front = unit(on, 3.5, 2.5, { team: MONSTERS })
        const back = unit(on, 3.5, 4.5, { team: MONSTERS })
        play(on, [[hero, chain(MIRROR, THRUST)]])
        expect(front.life).toBeLessThan(4)
        expect(back.life).toBeLessThan(4)
    })

    test("delayed charge plays once with nothing before it, once more per pair", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[hero, chain(DELAYED_CHARGE, THRUST)]])
        expect(foe.life).toBe(2)

        const on2 = battle()
        const hero2 = unit(on2, 3.5, 6)
        const foe2 = unit(on2, 3.5, 5, { team: MONSTERS })
        play(on2, [[hero2, chain(WAIT, WAIT, DELAYED_CHARGE, THRUST)]])
        expect(foe2.life).toBe(0)
    })

    test("the telescope puts the stats back after its action", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const precision = hero.stats.precision.value
        const range = hero.stats.throwRange.value
        play(on, [[hero, chain(SPYGLASS_CARD, CHARGED_SHOT)]])
        expect(hero.stats.precision.value).toBe(precision)
        expect(hero.stats.throwRange.value).toBe(range)
    })
})

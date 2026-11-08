import { describe, expect, test } from "vitest"
import {
    BLUE_HEART, Hook, IronChain, LaserLink, SPIRIT_ANCHOR, SPIRIT_PROJECTION, STEP, Vector2,
} from "@game/core/mecard"
import type { Battle, Tether, Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit, withPillars } from "../fixtures"

/** A battle started and past its preparation, nothing committed. */
function executing(on: Battle): Battle {
    on.startRound()
    on.endPreparation()
    return on
}

describe("Laser link", () => {
    test("each end of a turn → the enemies across the laser hurt, none other", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        const ally = unit(on, 5, 5)
        const across = unit(on, 3, 5, { team: MONSTERS })
        const aside = unit(on, 3, 2, { team: MONSTERS })
        executing(on)
        on.startProcess(hero, new LaserLink(ally, 1))
        on.unitStepped.notify(hero)
        expect(across.life).toBe(3)
        expect(aside.life).toBe(4)
        expect(ally.life).toBe(4)
    })

    test("tied, then untied with the round → told to whoever shows it", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        const ally = unit(on, 5, 5)
        unit(on, 3, 1, { team: MONSTERS })
        const tied: Tether[] = []
        on.signals.tethered.add(({ tether }) => tied.push(tether))
        on.signals.untethered.add(({ tether }) => tied.splice(tied.indexOf(tether), 1))
        executing(on)
        on.startProcess(hero, new LaserLink(ally, 1))
        expect(tied.map(({ from, to, visual }) => [from, to, visual.visual])).toEqual([[hero, ally, "tethers/laser"]])
        on.endProcesses(hero)
        expect(tied).toEqual([])
    })
})

describe("Hook", () => {
    test("the unit moves and turns → the ally keeps its place next to it", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const ally = unit(on, 4, 5)
        unit(on, 1, 1, { team: MONSTERS })
        executing(on)
        on.startProcess(hero, new Hook(ally, 1.5))
        on.move(hero, Vector2.UP, 1)
        expectAt(ally, 4, 4)
        on.turn(hero, Vector2.RIGHT)
        expectAt(ally, 3, 5)
        // It faced as the unit did: it faces as the unit does.
        expect(ally.direction.x).toBeCloseTo(1)
        expect(ally.direction.y).toBeCloseTo(0)
    })

    test("the ally blocked, too far → the hook breaks", () => {
        const on = withPillars(battle(), { center: new Vector2(4, 4), radius: 0.4 })
        const hero = unit(on, 3, 5)
        const ally = unit(on, 4, 5)
        unit(on, 1, 1, { team: MONSTERS })
        executing(on)
        on.startProcess(hero, new Hook(ally, 1.5))
        on.move(hero, Vector2.UP, 2)
        expect(hero.processes).toEqual([])
    })
})

describe("Iron chain", () => {
    test("too far apart at the end of a turn → each pulled a meter toward the other", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        const target = unit(on, 4, 5, { team: MONSTERS })
        executing(on)
        on.startProcess(hero, new IronChain(target, 2, 1))
        on.unitStepped.notify(hero)
        expectAt(hero, 2, 5)
        expectAt(target, 3, 5)
        expect(hero.life).toBe(4)
        expect(target.life).toBe(4)
    })

    test("close enough → nothing pulled", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        const target = unit(on, 2.5, 5, { team: MONSTERS })
        executing(on)
        on.startProcess(hero, new IronChain(target, 2, 1))
        on.unitStepped.notify(hero)
        expectAt(hero, 1, 5)
        expectAt(target, 2.5, 5)
    })
})

describe("Spirits", () => {
    test("an anchor → back where the spirit stands at the end of the round, the spirit gone", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(SPIRIT_ANCHOR, STEP)]])
        expectAt(hero, 3, 5)
        expect(on.units.some(each => each.name === "Esprit")).toBe(false)
    })

    test("a projection → a spirit of a blue heart plays the cards after it, the unit plays none of them", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const spawned: Unit[] = []
        on.signals.spawned.add(({ unit: born }) => {
            spawned.push(born)
            expect(born.hearts.all.map(heart => heart.kind)).toEqual([BLUE_HEART])
        })
        play(on, [[hero, chain(SPIRIT_PROJECTION, STEP, STEP)]])
        expectAt(hero, 3, 5)
        expect(spawned.map(String)).toEqual(["Esprit projeté"])
        // It walked the steps of the unit, then faded with its blue heart at the end of the round.
        expect(spawned[0].position.y).toBeLessThan(3.5)
        expect(spawned[0].alive).toBe(false)
    })
})

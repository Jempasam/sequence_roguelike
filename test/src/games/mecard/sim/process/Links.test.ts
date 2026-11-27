import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { SHADOW } from "@game/core-src/games/mecard/sim/card/subs/combat/Shadow"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import {
    SPIRIT_ANCHOR,
    SPIRIT_PROJECTION,
} from "@game/core-src/games/mecard/sim/card/subs/summon/SpiritCards"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { Hook, IronChain, LaserLink } from "@game/core-src/games/mecard/sim/process/subs/Links"
import * as Walk from "@game/core-src/games/mecard/sim/battle/mecanic/walk"
import * as Turn from "@game/core-src/games/mecard/sim/battle/mecanic/turn"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Tether } from "@game/core-src/games/mecard/sim/battle/signals"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

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

describe("Shadow", () => {
    test("a shadow left then a step → the unit tied to its shadow, untied once the round is over", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const tied: Tether[] = []
        const everTied: Tether[] = []
        on.signals.tethered.add(({ tether }) => { tied.push(tether); everTied.push(tether) })
        on.signals.untethered.add(({ tether }) => tied.splice(tied.indexOf(tether), 1))
        play(on, [[hero, chain(SHADOW, STEP)]])
        expect(everTied.map(({ from, to }) => [from, to.name])).toEqual([[hero, "Ombre"]])
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
        Walk.move(on, hero, Vector2.UP, 1)
        expectAt(ally, 4, 4)
        Turn.turn(on, hero, Vector2.RIGHT)
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
        Walk.move(on, hero, Vector2.UP, 2)
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

    test("an anchor then a step → the unit tied to its spirit while the round lasts, untied with it", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const tied: Tether[] = []
        const everTied: Tether[] = []
        on.signals.tethered.add(({ tether }) => { tied.push(tether); everTied.push(tether) })
        on.signals.untethered.add(({ tether }) => tied.splice(tied.indexOf(tether), 1))
        play(on, [[hero, chain(SPIRIT_ANCHOR, STEP)]])
        expect(everTied.map(({ from, to }) => [from, to.name])).toEqual([[hero, "Esprit"]])
        expect(tied).toEqual([])
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

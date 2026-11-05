import { describe, expect, it } from "vitest"
import {
    FOCUS, HORSE, saveBattle, STEP, Strength, STRENGTH_CARD, Vector2, WAIT,
} from "@game/core/mecard"
import type { Process } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

describe("Process", () => {
    it("goes on until the end of the round, then is taken back", () => {
        const on = battle()
        const hero = unit(on, 1, 5, { hand: [STRENGTH_CARD, WAIT] })
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        on.commit(hero, chain(STRENGTH_CARD, WAIT))
        on.endPreparation()
        on.tick()
        expect(hero.stats.strength.value).toBe(1)
        expect(hero.processes.map(String)).toEqual(["force +1"])
        on.playRound()
        expect(hero.stats.strength.value).toBe(0)
        expect(hero.processes).toEqual([])
    })

    it("never merges: the same one started twice goes on twice", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        on.endPreparation()
        on.startProcess(hero, new Strength(1))
        on.startProcess(hero, new Strength(1))
        expect(hero.processes.length).toBe(2)
        expect(hero.stats.strength.value).toBe(2)
    })

    it("ends when its unit dies, and does what it does as it ends", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        unit(on, 6, 1, { team: MONSTERS })
        unit(on, 6, 3, { team: MONSTERS })
        const ended: string[] = []
        const process: Process = {
            name: "témoin", icon: "strength", color: new Strength(1).color,
            toString: () => "témoin", toSemString: () => "témoin",
            init: ({ hold }) => hold(() => ended.push("repris")),
            dispose: () => ended.push("fini"),
        }
        on.startRound()
        on.endPreparation()
        on.startProcess(hero, process)
        hero.hearts.slay(null)
        expect(ended).toEqual(["fini", "repris"])
        expect(hero.processes).toEqual([])
    })

    it("is told to whoever shows the battle as it starts and ends", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        unit(on, 6, 1, { team: MONSTERS })
        const told: string[] = []
        on.signals.processStarted.add(({ process }) => told.push(`+${process.name}`))
        on.signals.processEnded.add(({ process }) => told.push(`-${process.name}`))
        play(on, [[hero, chain(STRENGTH_CARD)]])
        expect(told).toEqual(["+force +1", "-force +1"])
    })

    it("never stands in the way of a save: none is left between two rounds", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        unit(on, 6, 1, { team: MONSTERS })
        play(on, [[hero, chain(FOCUS, STEP)]])
        expect(() => saveBattle(on)).not.toThrow()
    })
})

describe("Cheval", () => {
    it("carries its rider at once, then before each of its steps", () => {
        const on = battle()
        const rider = unit(on, 1, 6, { direction: Vector2.UP })
        unit(on, 6, 0.5, { team: MONSTERS })
        play(on, [[rider, chain(HORSE, WAIT, WAIT)]])
        // 1 m at once, then 1 m before each of the two waits.
        expectAt(rider, 1, 3)
    })

    it("previews how far it carries its rider, at once then before each step", () => {
        const on = battle()
        const rider = unit(on, 1, 6, { direction: Vector2.UP })
        unit(on, 6, 0.5, { team: MONSTERS })
        const [horse, first, second] = chain(HORSE, WAIT, WAIT).preview(on, rider, false)
        expect(horse.preview?.indicators.map(indicator => indicator.kind)).toEqual(["label", "arrow"])
        expect(horse.preview?.pose.position.y).toBeCloseTo(5)
        expect(first.preview?.pose.position.y).toBeCloseTo(4)
        expect(second.preview?.pose.position.y).toBeCloseTo(3)
    })
})

describe("Concentration", () => {
    it("is a process of strength for the round", () => {
        const on = battle()
        const hero = unit(on, 1, 5, { hand: [FOCUS, WAIT] })
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        on.commit(hero, chain(FOCUS, WAIT))
        on.endPreparation()
        expect(hero.processes.map(String)).toEqual(["force +1"])
    })
})

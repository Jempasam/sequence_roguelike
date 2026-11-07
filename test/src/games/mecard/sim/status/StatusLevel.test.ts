import { describe, expect, test } from "vitest"
import { BURN, DEMONIC, DODGE, POISONED, ROOTED, STEP, WAIT } from "@game/core/mecard"
import type { StatusType, Unit } from "@game/core/mecard"
import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Fixture builders ---

/** What the signals of a battle tell of the statuses, as text. */
function told(on: ReturnType<typeof battle>): string[] {
    const heard: string[] = []
    on.signals.statusAdded.add(({ type }) => heard.push(`+${type.name}`))
    on.signals.statusRemoved.add(({ type }) => heard.push(`-${type.name}`))
    return heard
}

/** The level a unit holds a kind of status at, none when it holds none. */
function levelOf(holder: Unit, type: StatusType): number|undefined {
    return holder.statusOf(type)?.level
}

// --- Tests ---

describe("the level of a status", () => {
    test("a kind applied again → its levels added, whatever the kind", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        on.applyStatus(hero, BURN, 2)
        on.applyStatus(hero, BURN, 3)
        on.applyStatus(hero, ROOTED, 1)
        on.applyStatus(hero, ROOTED, 4)
        expect(levelOf(hero, BURN)).toBe(5)
        expect(levelOf(hero, ROOTED)).toBe(5)
    })

    test("a kind applied again → told once as added", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const heard = told(on)
        on.applyStatus(hero, POISONED, 2)
        on.applyStatus(hero, POISONED, 2)
        expect(heard).toEqual([`+${POISONED.name}`])
    })

    test("a level below 0 → levels taken off, the status gone and told once when none is left", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        on.applyStatus(hero, POISONED, 3)
        const heard = told(on)
        on.applyStatus(hero, POISONED, -1)
        expect(levelOf(hero, POISONED)).toBe(2)
        on.applyStatus(hero, POISONED, -5)
        expect(hero.statusOf(POISONED)).toBeUndefined()
        expect(heard).toEqual([`-${POISONED.name}`])
    })

    test("a level below 0 on a unit holding none → nothing made, nothing told", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const heard = told(on)
        const events = on.events.length
        on.applyStatus(hero, POISONED, -2)
        on.applyStatus(hero, DODGE, 0)
        expect(hero.statuses.size).toBe(0)
        expect(heard).toEqual([])
        expect(on.events.length).toBe(events)
    })

    test("a status lasting rounds → one level less at the end of each, gone at 0", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.applyStatus(hero, DEMONIC, 3)
        const levels: (number|undefined)[] = []
        for(let round = 0; round < 4; round++){
            play(on, [[hero, chain(WAIT)]])
            levels.push(levelOf(hero, DEMONIC))
        }
        expect(levels).toEqual([2, 1, undefined, undefined])
    })

    test("a scaling status → its gain following the level, applied, taken off and counted down", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const base = hero.stats.strength.value
        on.applyStatus(hero, DEMONIC, 2)
        on.applyStatus(hero, DEMONIC, 3)
        expect(hero.stats.strength.value).toBe(base + 5)
        on.applyStatus(hero, DEMONIC, -2)
        expect(hero.stats.strength.value).toBe(base + 3)
        play(on, [[hero, chain(STEP)]])
        expect(hero.stats.strength.value).toBe(base + 2)
        on.applyStatus(hero, DEMONIC, -9)
        expect(hero.stats.strength.value).toBe(base)
    })
})

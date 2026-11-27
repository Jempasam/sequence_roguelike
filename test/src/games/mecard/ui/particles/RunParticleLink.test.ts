import { describe, expect, test } from "vitest"
import { BLINKED } from "@game/core-src/games/mecard/sim/battle/mecanic/blink/signals"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import type { Place } from "@game/core-src/games/mecard/sim/run/Journey"
import type { Run } from "@game/core-src/games/mecard/sim/run/Run"
import type { Observable } from "@game/core-src/lifetime/Observable"
import { Forwarded } from "@game/core/mecard/forwarded"
import { RunParticleLink } from "@game/core/mecard/run-particle-link"
import { fightOf } from "../../../../fixtures/fightFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** What places the particles. */
type ParticleContext = NonNullable<RunParticleLink["context"]>

/** Reach a fight, to be fought by the run. */
function reachFight(run: Run): void {
    const place: Place = {
        layer: 1, across: 0.5, next: [], exitTo: null, fight: fightOf(BATTLE, GOBLIN), halt: null,
    }
    run.travel.jump(place)
    run.travel.journey.link(place, place)
    run.travel.go(place)
    run.travel.enter()
}

/** A link on a run that fights, and what tells it the screen plays. */
function linkOf(): { link: RunParticleLink, run: Run, forwarded: Forwarded } {
    const run = startedRun(1)
    reachFight(run)
    const forwarded = new Forwarded(error => { throw error })
    const link = new RunParticleLink(run, forwarded, () => null)
    run.startBattle()
    return { link, run, forwarded }
}

/** A context that shows everything at one point, with a counter or without, and what is given over it. */
function contextOf(counter: boolean, over: Partial<ParticleContext> = {}): ParticleContext {
    const at = { x: 40, y: 50 }
    return {
        unitPosition: () => at,
        heartsOf: () => at,
        feetOf: () => at,
        goldCounter: () => counter ? { x: 10, y: 5 } : null,
        deckPile: () => ({ x: 200, y: 100 }),
        heroPortrait: () => at,
        placePosition: () => at,
        mapArea: () => null,
        pointer: () => at,
        center: () => ({ x: 160, y: 90 }),
        size: () => ({ width: 320, height: 180 }),
        ...over,
    }
}

/** Play the particles on until none is left, with a big cap. */
function playOut(link: RunParticleLink): void {
    for(let step = 0; step < 1000 && link.active; step++) link.update(0.05)
}

/** How many particles are alive, whatever their blend. */
function alive(link: RunParticleLink): number {
    return link.alpha.count + link.additive.count
}

describe("RunParticleLink, gold in a battle", () => {
    test("gold won while the animation starts → coins thrown", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        expect(link.alpha.count).toBeGreaterThan(0)
    })

    test("gold won while the animation ends → nothing", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "end")
        expect(link.active).toBe(false)
    })

    test("no context → nothing, and no error", () => {
        const { link, run, forwarded } = linkOf()
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        expect(link.active).toBe(false)
    })

    test("a unit not shown → nothing", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true, { unitPosition: () => null })
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        expect(link.active).toBe(false)
    })

    test("a counter shown → sparks come on it once the coins land", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        let sparked = false
        for(let step = 0; step < 1000 && link.active; step++){
            link.update(0.05)
            if(link.additive.count > 0) sparked = true
        }
        expect(sparked).toBe(true)
        expect(link.active).toBe(false)
    })

    test("no counter shown → the coins fall away and nothing is left", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        playOut(link)
        expect(link.active).toBe(false)
    })

    test("more gold → more coins, up to a cap", () => {
        const counts = [0, 10, 1000].map(amount => {
            const { link, run, forwarded } = linkOf()
            link.context = contextOf(true)
            const [unit] = run.battle!.units
            forwarded.forward(run.battle!.onGetGold, { unit, amount }, "start")
            return link.alpha.count
        })
        expect(counts[1]).toBeGreaterThan(counts[0])
        expect(counts[2]).toBeGreaterThanOrEqual(counts[1])
        expect(counts[2]).toBeLessThanOrEqual(14)
    })

    test("disposed → nothing is told any more, and nothing is left", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        link.dispose()
        expect(link.active).toBe(false)
        forwarded.forward(run.battle!.onGetGold, { unit, amount: 10 }, "start")
        expect(link.active).toBe(false)
    })
})

describe("RunParticleLink, the gold of the run", () => {
    test("a gain with a counter shown → coins, and none for a spending", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(true)
        forwarded.forward(run.goldChanged, run.gold + 20, "start")
        expect(link.alpha.count).toBeGreaterThan(0)
        link.clear()
        forwarded.forward(run.goldChanged, run.gold + 5, "start")
        expect(link.active).toBe(false)
    })

    test("no counter shown → nothing", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        forwarded.forward(run.goldChanged, run.gold + 20, "start")
        expect(link.active).toBe(false)
    })
})

describe("RunParticleLink, the battle", () => {
    test.each([1, 5, 20])("a blow of %i hearts → sparks, and nothing is left once played", amount => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.signals.damaged, { unit, amount } as never, "start")
        expect(alive(link)).toBeGreaterThan(0)
        playOut(link)
        expect(link.active).toBe(false)
    })

    test("a harder blow → more particles", () => {
        const counts = [1, 5, 20].map(amount => {
            const { link, run, forwarded } = linkOf()
            link.context = contextOf(false)
            const [unit] = run.battle!.units
            forwarded.forward(run.battle!.signals.damaged, { unit, amount } as never, "start")
            return alive(link)
        })
        expect(counts[1]).toBeGreaterThan(counts[0])
        expect(counts[2]).toBeGreaterThan(counts[1])
    })

    test.each(["healed", "died", "spawned", "statusAdded"] as const)(
        "%s → particles on the unit",
        name => {
            const { link, run, forwarded } = linkOf()
            link.context = contextOf(false)
            const [unit] = run.battle!.units
            forwarded.forward(run.battle!.signals[name] as Observable<unknown>, { unit }, "start")
            expect(alive(link)).toBeGreaterThan(0)
        },
    )

    test("blinked → particles on the unit", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.observers.of(BLINKED), { unit } as never, "start")
        expect(alive(link)).toBeGreaterThan(0)
    })

    test("a unit not shown → no particle of the signals", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false, {
            unitPosition: () => null,
            feetOf: () => null,
            heartsOf: () => null,
        })
        const [unit] = run.battle!.units
        for(const name of ["healed", "died", "spawned"] as const){
            forwarded.forward(run.battle!.signals[name] as Observable<unknown>, { unit }, "start")
        }
        expect(link.active).toBe(false)
    })

    test("cards won with a deck shown → they fly there and light it", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.onGetCards, { unit, cards: [{}, {}] } as never, "start")
        expect(link.additive.count).toBeGreaterThan(0)
        const before = link.additive.count
        link.update(0.8)
        link.update(0.8)
        expect(link.additive.count).not.toBe(before)
        playOut(link)
        expect(link.active).toBe(false)
    })
})

describe("RunParticleLink, the party", () => {
    test("an item gained → particles toward the portrait, or on the spot without one", () => {
        const { link, run, forwarded } = linkOf()
        const [hero] = run.heroes
        link.context = contextOf(false)
        forwarded.forward(run.itemGained, { hero, gained: {} } as never, "start")
        const flying = alive(link)
        link.clear()
        link.context = contextOf(false, { heroPortrait: () => null })
        forwarded.forward(run.itemGained, { hero, gained: {} } as never, "start")
        expect(flying).toBeGreaterThan(0)
        expect(alive(link)).toBeGreaterThan(0)
    })

    test.each(["heartGained", "usableGained"] as const)("%s → particles", name => {
        const { link, run, forwarded } = linkOf()
        const [hero] = run.heroes
        link.context = contextOf(false)
        forwarded.forward(run[name] as Observable<unknown>, { hero, gained: {} }, "start")
        expect(alive(link)).toBeGreaterThan(0)
    })

    test("a booster, an upgrade and a kit → particles at the center", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        forwarded.forward(run.boosterOpened, {} as never, "start")
        expect(alive(link)).toBeGreaterThan(24)
        link.clear()
        forwarded.forward(run.upgradeApplied, {} as never, "start")
        expect(alive(link)).toBeGreaterThan(0)
        link.clear()
        forwarded.forward(run.kitHired, {} as never, "start")
        expect(alive(link)).toBeGreaterThan(0)
    })

    test("the party healed → particles on each portrait shown", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        forwarded.forward(run.partyHealed, run.heroes, "start")
        expect(alive(link)).toBe(5 * run.heroes.length)
    })

    test("a hero joins → particles, even when its portrait is not shown yet", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false, { heroPortrait: () => null })
        forwarded.forward(run.heroJoined, run.heroes[0], "start")
        expect(alive(link)).toBeGreaterThan(0)
    })
})

describe("RunParticleLink, the journey", () => {
    test("a move, a visit, a fight → particles on the place", () => {
        const { link, run, forwarded } = linkOf()
        const place = run.travel.place!
        link.context = contextOf(false)
        forwarded.forward(run.travel.moved, { from: null, to: place }, "start")
        expect(alive(link)).toBeGreaterThan(0)
        link.clear()
        forwarded.forward(run.travel.fightEntered, place, "start")
        expect(alive(link)).toBeGreaterThan(0)
        link.clear()
        forwarded.forward(run.travel.fightLeft, place, "start")
        expect(alive(link)).toBeGreaterThan(0)
    })

    test("a place not shown → no particle for its move", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false, { placePosition: () => null })
        forwarded.forward(run.travel.moved, { from: null, to: run.travel.place! }, "start")
        expect(link.active).toBe(false)
    })

    test("a floor entered → streaks across the interface", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        forwarded.forward(run.travel.floorEntered, run.travel.floor, "start")
        expect(link.additive.count).toBe(24)
        playOut(link)
        expect(link.active).toBe(false)
    })
})

describe("RunParticleLink, the limit", () => {
    test("too many events → the particles stay capped", () => {
        const { link, run, forwarded } = linkOf()
        link.context = contextOf(false)
        for(let index = 0; index < 200; index++) forwarded.forward(run.boosterOpened, {} as never, "start")
        expect(link.additive.count).toBeLessThanOrEqual(link.additive.maxParticles)
    })
})

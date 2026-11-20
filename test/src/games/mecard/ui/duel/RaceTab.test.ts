import { describe, expect, test } from "vitest"
import { Observable } from "@game/core/mecard"
import type { DuelFighting, DuelRacePlayer, RosterEntry } from "@game/core/mecard/sync"
import { RaceTab } from "@game/core/mecard/duel-ui"

import { uiSetup } from "../../../../fixtures/uiFixtures"

/** A player of a race that tells what it is told to, with the lives and the time left it is given. */
function playerOf(lives: Map<string, number>, remaining: () => number|null, maxLives = 6) {
    const sink = () => {}
    const fighting = new Observable<DuelFighting>(sink)
    const watching = new Observable<{ sides: readonly (readonly string[])[] }>(sink)
    const duelOver = new Observable<boolean|null>(sink)
    const won = new Observable<string>(sink)
    const finished = new Observable<void>(sink)
    const eliminated = new Observable<void>(sink)
    const player = {
        fighting, watching, duelOver, won, finished, eliminated,
        deadline: { remaining },
        lives: { livesOf: (id: string) => lives.get(id) ?? null },
        others: { progressOf: () => null },
        maxLives,
    } as unknown as DuelRacePlayer
    return { player, fighting, watching, duelOver, won, finished, eliminated }
}

const MEMBERS: RosterEntry[] = [
    { id: "host", name: "Hôte", lost: false },
    { id: "a", name: "Ana", lost: false },
    { id: "b", name: "Bob", lost: true },
]

describe("RaceTab", () => {
    test("a race followed → the time left in the timer and on the edge when it runs", () => {
        const setup = uiSetup({}, 620, 348)
        let remaining: number|null = null
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player } = playerOf(new Map([["host", 6], ["a", 1], ["b", 0]]), () => remaining)
        tab.follow(player)
        tab.frame()
        expect(tab.timer).toBe("")
        expect(tab.edge).toBe("Course de duels")
        remaining = 12_300
        tab.frame()
        expect(tab.timer).toBe("13 s")
        expect(tab.edge).toBe("13 s")
        expect(tab.info).toBe("Les autres arrivent dans")
        remaining = null
        tab.frame()
        expect(tab.timer).toBe("")
    })

    test("a duel fought, watched, over → told in a banner, with the names of the players", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player, fighting, watching, duelOver } = playerOf(new Map(), () => null)
        tab.follow(player)
        fighting.notify({ allies: ["host", "a"], opponents: ["b"] } as unknown as DuelFighting)
        tab.frame()
        expect(tab.banner).toBe("Duel : Hôte, Ana contre Bob")
        watching.notify({ sides: [["a"], ["b"]] })
        tab.frame()
        expect(tab.banner).toBe("Tu regardes : Ana contre Bob")
        duelOver.notify(true)
        expect(tab.banner).toBe("Duel gagné !")
        duelOver.notify(false)
        expect(tab.banner).toBe("Duel perdu.")
        tab.frame()
        expect(tab.edge).toBe("Duel perdu.")
    })

    test("the race won, finished, or the player out → told in a banner", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player, won, finished, eliminated } = playerOf(new Map(), () => null)
        tab.follow(player)
        eliminated.notify()
        expect(tab.banner).toBe("Tu es éliminé : tu regardes la suite.")
        won.notify("a")
        expect(tab.banner).toBe("Ana a gagné la course !")
        finished.notify()
        expect(tab.banner).toBe("Personne n'a gagné la course.")
    })

    test("folded until the pointer is over it → it stays folded and settable to another place", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS, { layout: "track" })
        const { player } = playerOf(new Map(), () => 5_000)
        tab.follow(player)
        tab.frame(1)
        expect(tab.open).toBe(0)
        expect(tab.layout).toBe("track")
        tab.align = "end"
        expect(tab.align).toBe("end")
    })

    test("detached → nothing is shown, and what the player tells is not heard any more", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player, won } = playerOf(new Map(), () => null)
        tab.follow(player)
        tab.frame()
        tab.detach()
        won.notify("a")
        tab.frame()
        expect(tab.banner).toBe("")
        expect(tab.edge).toBe("")
    })
})

describe("RaceTab blinking and texts", () => {
    test("the timer runs → blinks red from its start, and stops with it", () => {
        const setup = uiSetup({}, 620, 348)
        let remaining: number|null = 60_000
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player } = playerOf(new Map(), () => remaining)
        tab.follow(player)
        const seen = new Set<boolean>()
        for(let frame = 0; frame < 40; frame++){
            tab.frame(0.1)
            seen.add(tab.red)
        }
        expect(seen).toEqual(new Set([true, false]))
        remaining = null
        tab.frame(0.1)
        expect(tab.red).toBe(false)
    })

    test("a duel lost → red for good", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player, duelOver } = playerOf(new Map(), () => null)
        tab.follow(player)
        duelOver.notify(false)
        tab.frame(0.1)
        expect(tab.red).toBe(true)
        tab.frame(0.7)
        expect(tab.red).toBe(true)
    })

    test("the multiplayer texts → the name under, the places gone through above, replaceable", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player } = playerOf(new Map(), () => null)
        tab.follow(player)
        tab.frame()
        expect(tab.entries.map(entry => [entry.top, entry.bottom])).toEqual([["0", "Hôte"], ["0", "Ana"], ["0", "Bob"]])
        const other = uiSetup({}, 620, 348)
        const custom = new RaceTab(other.theme, other.ui, () => MEMBERS, { labels: { top: () => "★" } })
        custom.follow(player)
        custom.frame()
        expect(custom.entries[0]).toMatchObject({ top: "★", bottom: "Hôte" })
    })

    test("lives → shown when the mode gives several, full and lost, none for one life or when told off", () => {
        const setup = uiSetup({}, 620, 348)
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS)
        const { player } = playerOf(new Map([["host", 6], ["a", 2], ["b", 0]]), () => null, 6)
        tab.follow(player)
        tab.frame()
        expect(tab.entries.map(entry => [entry.lives, entry.maxLives])).toEqual([[6, 6], [2, 6], [0, 6]])
        const single = uiSetup({}, 620, 348)
        const versus = new RaceTab(single.theme, single.ui, () => MEMBERS)
        versus.follow(playerOf(new Map(), () => null, 1).player)
        versus.frame()
        expect(versus.entries.every(entry => entry.maxLives === 0)).toBe(true)
        const off = uiSetup({}, 620, 348)
        const hidden = new RaceTab(off.theme, off.ui, () => MEMBERS, { lives: false })
        hidden.follow(player)
        hidden.frame()
        expect(hidden.entries.every(entry => entry.maxLives === 0)).toBe(true)
    })

    test("leaving → asks to be sure, then leaves; the doubt lapses; no way out without a callback", () => {
        const setup = uiSetup({}, 620, 348)
        let left = 0
        const tab = new RaceTab(setup.theme, setup.ui, () => MEMBERS, { onLeave: () => { left++ } })
        const { player } = playerOf(new Map(), () => null)
        tab.follow(player)
        tab.frame()
        expect(tab.leaveLabel).toBe("Quitter la partie")
        tab.requestLeave()
        tab.frame()
        expect(tab.leaveLabel).toBe("Sûr ? Quitter")
        expect(left).toBe(0)
        tab.requestLeave()
        expect(left).toBe(1)
        tab.requestLeave()
        tab.frame(4)
        expect(tab.leaveLabel).toBe("Quitter la partie")
        tab.requestLeave()
        expect(left).toBe(1)
        const other = uiSetup({}, 620, 348)
        const none = new RaceTab(other.theme, other.ui, () => MEMBERS)
        none.follow(player)
        none.frame()
        none.requestLeave()
        expect(none.leaveLabel).toBe("")
        expect(none.active).toBe(true)
    })
})

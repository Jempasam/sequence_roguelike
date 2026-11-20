import { describe, expect, test } from "vitest"
import { Observable } from "@game/core/mecard"
import type { DuelFighting, DuelRacePlayer, RosterEntry } from "@game/core/mecard/sync"
import { RaceHud } from "@game/core/mecard/duel-ui"

import { uiSetup } from "../../../../fixtures/uiFixtures"

/** A player of a race that tells what it is told to, with the lives and the time left it is given. */
function playerOf(lives: Map<string, number>, remaining: () => number|null) {
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
    } as unknown as DuelRacePlayer
    return { player, fighting, watching, duelOver, won, finished, eliminated }
}

const MEMBERS: RosterEntry[] = [
    { id: "host", name: "Hôte", lost: false },
    { id: "a", name: "Ana", lost: false },
    { id: "b", name: "Bob", lost: true },
]

describe("RaceHud", () => {
    test("a race followed → the lives of everyone, the host starred, and the time left when it runs", () => {
        const setup = uiSetup({}, 620, 348)
        let remaining: number|null = null
        const hud = new RaceHud(setup.theme, setup.ui, () => MEMBERS)
        const { player } = playerOf(new Map([["host", 6], ["a", 1], ["b", 0]]), () => remaining)
        hud.follow(player)
        hud.frame()
        expect(hud.lines).toEqual(["★ Hôte : 6 vies", "Ana : 1 vie", "Bob : éliminé"])
        remaining = 12_300
        hud.frame()
        expect(hud.lines[0]).toBe("Les autres arrivent : 13 s")
        remaining = null
        hud.frame()
        expect(hud.lines).toHaveLength(3)
    })

    test("a duel fought, watched, over → told in a banner, with the names of the players", () => {
        const setup = uiSetup({}, 620, 348)
        const hud = new RaceHud(setup.theme, setup.ui, () => MEMBERS)
        const { player, fighting, watching, duelOver } = playerOf(new Map(), () => null)
        hud.follow(player)
        fighting.notify({ allies: ["host", "a"], opponents: ["b"] } as unknown as DuelFighting)
        hud.frame()
        expect(hud.lines[0]).toBe("Duel : Hôte, Ana contre Bob")
        watching.notify({ sides: [["a"], ["b"]] })
        hud.frame()
        expect(hud.lines[0]).toBe("Tu regardes : Ana contre Bob")
        duelOver.notify(true)
        hud.frame()
        expect(hud.lines[0]).toBe("Duel gagné !")
        duelOver.notify(false)
        hud.frame()
        expect(hud.lines[0]).toBe("Duel perdu.")
    })

    test("the race won, finished, or the player out → told in a banner", () => {
        const setup = uiSetup({}, 620, 348)
        const hud = new RaceHud(setup.theme, setup.ui, () => MEMBERS)
        const { player, won, finished, eliminated } = playerOf(new Map(), () => null)
        hud.follow(player)
        eliminated.notify()
        hud.frame()
        expect(hud.lines[0]).toBe("Tu es éliminé : tu regardes la suite.")
        won.notify("a")
        hud.frame()
        expect(hud.lines[0]).toBe("Ana a gagné la course !")
        finished.notify()
        hud.frame()
        expect(hud.lines[0]).toBe("Personne n'a gagné la course.")
    })

    test("detached → nothing is shown, and what the player tells is not heard any more", () => {
        const setup = uiSetup({}, 620, 348)
        const hud = new RaceHud(setup.theme, setup.ui, () => MEMBERS)
        const { player, won } = playerOf(new Map(), () => null)
        hud.follow(player)
        hud.frame()
        hud.detach()
        won.notify("a")
        hud.frame()
        expect(hud.lines).toEqual([])
    })
})

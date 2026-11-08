import { describe, expect, test } from "vitest"
import { CHEST_HALT, planFor, Run } from "@game/core/mecard"
import { LocalSync, RunBroadcaster, RunReceiver } from "@game/core/mecard/sync"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A main client telling a run, and a viewer listening to it. */
function session(seed = 11) {
    const channel = new LocalSync()
    const run = startedRun(seed)
    const viewer = startedRun(0)
    const receiver = new RunReceiver(viewer, channel)
    const broadcaster = new RunBroadcaster(run, channel)
    return { channel, run, viewer, receiver, broadcaster }
}

/** Reach a fight of the run, its battle started. */
function fight(run: Run): void {
    const { travel } = run
    const before = travel.journey.places.find(place => {
        return travel.journey.nextOf(place).some(next => next.monsters.length > 0)
    })
    if(!before) throw new Error("The map leads to no fight.")
    travel.jump(before)
    const place = travel.next.find(next => next.monsters.length > 0)
    if(!place) throw new Error("The map leads to no fight.")
    travel.go(place)
    travel.advance()
    run.advance()
}

/** The party and what it holds, as text. */
function textOf(run: Run): string {
    return JSON.stringify(run.save())
}

// --- Tests ---

describe("RunReceiver", () => {
    test("a run told → as it stands, at once", () => {
        const { run, viewer } = session()
        expect(textOf(viewer)).toBe(textOf(run))
    })

    test("a halt left → the gold and the decks of the viewer are the main client's", () => {
        const { run, viewer } = session()
        run.travel.visit(CHEST_HALT)
        run.gold = 777
        run.changeDeck(run.heroes[0].decks[0], deck => deck.pop())
        run.travel.leave()
        expect(viewer.gold).toBe(777)
        expect(textOf(viewer)).toBe(textOf(run))
    })

    test("a battle starts → the viewer fights it, and takes its rounds in", () => {
        const { run, viewer } = session()
        fight(run)
        expect(viewer.phase).toBe("battle")
        const battle = run.battle
        const watched = viewer.battle
        if(!battle || !watched) throw new Error("The battle is not fought.")
        battle.advance()
        expect(watched.round).toBe(1)
        for(const unit of battle.initiative) if(unit.controller === "player") battle.commit(unit, planFor(unit))
        battle.advance()
        expect(watched.round).toBe(battle.round)
        expect(watched.phase).toBe(battle.phase)
    })

    test("a fight left → the viewer's run is the main client's, back on the map", () => {
        const { run, viewer } = session()
        fight(run)
        run.gold = 555
        run.heroes[0].hearts[0].isEmpty = true
        expect(viewer.gold).not.toBe(555)
        run.backToMap()
        expect(viewer.phase).toBe("travel")
        expect(viewer.gold).toBe(555)
        expect(textOf(viewer)).toBe(textOf(run))
    })

    test("a new run told → loaded in its place", () => {
        const { viewer, broadcaster } = session()
        const next = startedRun(12)
        next.gold = 321
        broadcaster.engine = next
        expect(textOf(viewer)).toBe(textOf(next))
    })

    test("a message in another shape → told to onError", () => {
        const { receiver } = session()
        const errors: unknown[] = []
        receiver.onError = error => errors.push(error)
        receiver.receive("{\"kind\":\"hello\"}")
        expect(errors).toHaveLength(1)
    })
})

describe("RunBroadcaster", () => {
    test("a fight left while the party still enters a place → nothing thrown", () => {
        const { run } = session()
        run.startBattle()
        run.travel.go(run.travel.next[0])
        run.backToMap()
        expect(run.travel.phase).toBe("entering")
    })

    test("a viewer connecting during a fight → it watches the battle, from the last round told", () => {
        const channel = new LocalSync()
        const run = startedRun(11)
        new RunBroadcaster(run, channel)
        fight(run)
        const battle = run.battle
        if(!battle) throw new Error("The battle is not fought.")
        battle.advance()
        const viewer = startedRun(0)
        new RunReceiver(viewer, channel)
        expect(viewer.phase).toBe("battle")
        expect(viewer.battle?.round).toBe(battle.round)
    })

    test("a viewer connecting on the map → the run, no battle", () => {
        const channel = new LocalSync()
        const run = startedRun(11)
        new RunBroadcaster(run, channel)
        fight(run)
        run.backToMap()
        const viewer = startedRun(0)
        new RunReceiver(viewer, channel)
        expect(viewer.phase).toBe("travel")
        expect(textOf(viewer)).toBe(textOf(run))
    })
})

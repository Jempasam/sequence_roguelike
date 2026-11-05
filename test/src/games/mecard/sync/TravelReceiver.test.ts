import { describe, expect, test } from "vitest"
import { CAVE_FLOOR, Run, saveRun } from "@game/core/mecard"
import type { ConfirmDialog, Place, PlaceMove, Travel } from "@game/core/mecard"
import {
    BATTLE_TOPIC, BattleBroadcaster, BattleReceiver, LocalSync, TRAVEL_TOPIC, TravelBroadcaster,
    TravelReceiver, writeTravelMessage,
} from "@game/core/mecard/sync"
import type { TravelDesync } from "@game/core/mecard/sync"
import { started } from "../sim/fixtures"

// --- Fixture builders ---

/** A main client following the journey of a run, and a viewer listening to it, its drifts kept. */
function session(options: { held?: boolean, seed?: number } = {}) {
    const channel = new LocalSync(options.held ?? false)
    const run = new Run(options.seed ?? 11)
    const viewer = new TravelReceiver(channel)
    const drifts: TravelDesync[] = []
    viewer.onDesync = desync => drifts.push(desync)
    const broadcaster = new TravelBroadcaster(channel)
    broadcaster.follow(run.travel)
    return { channel, run, viewer, drifts, broadcaster }
}

/** The journey a viewer watches, which it must have. */
function watched(viewer: TravelReceiver): Travel {
    if(!viewer.travel) throw new Error("The viewer has no journey yet.")
    return viewer.travel
}

/** The rank of the place the party stands on. */
function rankOf(travel: Travel): number {
    return travel.place ? travel.journey.places.indexOf(travel.place) : -1
}

/** A place of a kind on the map, the first there. */
function placeOf(travel: Travel, kind: Place["kind"]): Place {
    const place = travel.journey.places.find(each => each.kind === kind)
    if(!place) throw new Error(`The map has no ${kind}.`)
    return place
}

/** Visit a halt and leave it, a change to the run made meanwhile. */
function visitAndLeave(run: Run, change: () => void): void {
    run.travel.visit("chest")
    change()
    run.travel.leave()
}

/** The run of a viewer, as text. */
function textOf(travel: Travel): string {
    return JSON.stringify(saveRun(travel.run))
}

// --- Tests ---

describe("TravelReceiver", () => {
    test("a journey followed → the run as it stands, at once", () => {
        const { run, viewer } = session()
        expect(textOf(watched(viewer))).toBe(textOf(run.travel))
    })

    test("the party moves → the viewer's journey tells the same move, where the party went", () => {
        const { run, viewer } = session()
        const moves: PlaceMove[] = []
        watched(viewer).moved.add(move => moves.push(move))
        const [first] = run.travel.next
        run.travel.go(first)
        expect(rankOf(watched(viewer))).toBe(rankOf(run.travel))
        expect(moves).toHaveLength(1)
        expect(moves[0].from).toBe(null)
        expect(moves[0].to).toBe(watched(viewer).place)
    })

    test("a move → the depth follows", () => {
        const { run, viewer } = session()
        run.travel.go(run.travel.next[0])
        run.travel.enter()
        run.backToMap()
        run.travel.go(run.travel.next[0])
        expect(run.travel.depth).toBe(2)
        expect(watched(viewer).depth).toBe(2)
    })

    test("a halt left → the gold and the decks of the viewer are the main client's", () => {
        const { run, viewer } = session()
        visitAndLeave(run, () => {
            run.gold = 777
            run.changeDeck(run.heroes[0].decks[0], deck => deck.pop())
        })
        expect(watched(viewer).run.gold).toBe(777)
        expect(textOf(watched(viewer))).toBe(textOf(run.travel))
    })

    test("a fight left → the viewer's run is the main client's, back on the map", () => {
        const { run, viewer } = session()
        run.travel.go(run.travel.next[0])
        run.travel.enter()
        run.startBattle()
        run.gold = 555
        run.heroes[0].hearts[0].isEmpty = true
        expect(watched(viewer).run.gold).not.toBe(555)
        run.backToMap()
        expect(watched(viewer).run.gold).toBe(555)
        expect(textOf(watched(viewer))).toBe(textOf(run.travel))
    })

    test("a halt visited, not left yet → nothing sent", () => {
        const { run, viewer } = session()
        const before = watched(viewer)
        run.travel.visit("chest")
        expect(watched(viewer)).toBe(before)
    })

    test("an exit taken → the new floor and its map, no drift", () => {
        const { run, viewer, drifts } = session()
        const exit = placeOf(run.travel, "exit")
        run.travel.jump(exit)
        run.travel.visit("exit")
        const [dialog] = run.travel.dialogs
        run.travel.accept(dialog as ConfirmDialog)
        expect(run.travel.floor.level).toBe(2)
        expect(watched(viewer).floor.level).toBe(2)
        expect(watched(viewer).place).toBe(null)
        expect(textOf(watched(viewer))).toBe(textOf(run.travel))
        expect(drifts).toEqual([])
    })

    test("a new run followed → told apart from the same journey", () => {
        const { viewer, broadcaster } = session()
        const loads: boolean[] = []
        viewer.onLoad = (_, { newJourney }) => loads.push(newJourney)
        const next = new Run(12)
        broadcaster.follow(next.travel)
        expect(loads).toEqual([true])
        visitAndLeave(next, () => {})
        expect(loads).toEqual([true, false])
    })

    test("a move lost, then a halt left → a drift told, the viewer caught up", () => {
        const { channel, run, viewer, drifts } = session()
        viewer.dispose()
        run.travel.jump(run.travel.next[0])
        channel.listen(text => viewer.receive(text))
        visitAndLeave(run, () => {})
        expect(drifts).toEqual([{ journey: 1, sequence: 3 }])
        expect(rankOf(watched(viewer))).toBe(rankOf(run.travel))
    })

    test("a move before any run → ignored, the next run taken in", () => {
        const channel = new LocalSync()
        const viewer = new TravelReceiver(channel)
        viewer.receive(writeTravelMessage({ kind: "moved", journey: 1, sequence: 2, from: null, to: 0, depth: 1 }))
        expect(viewer.travel).toBe(null)
        const save = saveRun(new Run(1))
        viewer.receive(writeTravelMessage({ kind: "state", journey: 1, sequence: 3, save }))
        expect(viewer.travel).not.toBe(null)
    })

    test("a message older than the one heard → ignored", () => {
        const viewer = new TravelReceiver(new LocalSync())
        const save = saveRun(new Run(1))
        viewer.receive(writeTravelMessage({ kind: "state", journey: 1, sequence: 2, save }))
        const loaded = viewer.travel
        viewer.receive(writeTravelMessage({ kind: "state", journey: 1, sequence: 1, save }))
        expect(viewer.travel).toBe(loaded)
    })

    test("a message in another shape → told to onError, nothing loaded", () => {
        const viewer = new TravelReceiver(new LocalSync())
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        viewer.receive("{\"kind\":\"hello\"}")
        expect(errors).toHaveLength(1)
        expect(viewer.travel).toBe(null)
    })

    test("a place the map does not have → told to onError", () => {
        const { viewer } = session()
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        viewer.receive(writeTravelMessage({ kind: "moved", journey: 1, sequence: 5, from: null, to: 9999, depth: 1 }))
        expect(errors).toHaveLength(1)
    })

    test("held → the moves wait, then come in order", () => {
        const { run, viewer } = session()
        const told: number[] = []
        const travel = watched(viewer)
        travel.moved.add(({ to }) => told.push(travel.journey.places.indexOf(to)))
        let held = true
        viewer.holding = () => held
        run.travel.jump(run.travel.next[0])
        const first = rankOf(run.travel)
        run.travel.jump(run.travel.next[0])
        const second = rankOf(run.travel)
        expect(told).toEqual([])
        held = false
        viewer.release()
        expect(told).toEqual([first, second])
    })

    test("held → a run that stands takes the place of the moves before it", () => {
        const { run, viewer } = session()
        const travel = watched(viewer)
        const told: PlaceMove[] = []
        travel.moved.add(move => told.push(move))
        let held = true
        viewer.holding = () => held
        run.travel.jump(run.travel.next[0])
        visitAndLeave(run, () => {
            run.gold = 5
        })
        held = false
        viewer.release()
        expect(told).toEqual([])
        expect(watched(viewer).run.gold).toBe(5)
    })
})

describe("TravelBroadcaster", () => {
    test("followed no more → sends nothing", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const broadcaster = new TravelBroadcaster(channel)
        const run = new Run(2)
        broadcaster.follow(run.travel)
        broadcaster.dispose()
        run.travel.jump(run.travel.next[0])
        expect(sent).toHaveLength(1)
    })

    test("a halt left → the run sent once", () => {
        const sent: string[] = []
        const broadcaster = new TravelBroadcaster({ send: message => sent.push(message) })
        const run = new Run(2)
        broadcaster.follow(run.travel)
        run.travel.visit("chest")
        run.backToMap()
        expect(sent).toHaveLength(2)
    })

    test("a fight left while the party still enters a place → nothing sent, nothing thrown", () => {
        const sent: string[] = []
        const broadcaster = new TravelBroadcaster({ send: message => sent.push(message) })
        const run = new Run(2)
        broadcaster.follow(run.travel)
        run.startBattle()
        run.travel.go(run.travel.next[0])
        const moved = sent.length
        run.backToMap()
        expect(run.travel.phase).toBe("entering")
        expect(sent).toHaveLength(moved)
    })

    test("only what stands is retained → a move is not", () => {
        const retained: (string|undefined)[] = []
        const broadcaster = new TravelBroadcaster({ send: (_, name) => retained.push(name) })
        const run = new Run(2)
        broadcaster.follow(run.travel)
        run.travel.jump(run.travel.next[0])
        expect(retained).toEqual(["travel", undefined])
    })
})

describe("SyncTopic", () => {
    test("a battle and a journey on one channel → each hears its own, no error", () => {
        const channel = new LocalSync()
        const battles = new BattleReceiver(BATTLE_TOPIC.source(channel))
        const journeys = new TravelReceiver(TRAVEL_TOPIC.source(channel))
        const errors: unknown[] = []
        battles.onError = error => errors.push(error)
        journeys.onError = error => errors.push(error)
        const run = new Run(11)
        new TravelBroadcaster(TRAVEL_TOPIC.sender(channel)).follow(run.travel)
        new BattleBroadcaster(BATTLE_TOPIC.sender(channel)).follow(started(run))
        expect(errors).toEqual([])
        expect(journeys.travel).not.toBe(null)
        expect(battles.battle).not.toBe(null)
    })

    test("a floor of the catalog → sent by name", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        new TravelBroadcaster(TRAVEL_TOPIC.sender(channel)).follow(new Run(1).travel)
        expect(sent[0].startsWith("travel:")).toBe(true)
        expect(sent[0]).toContain(CAVE_FLOOR.name)
    })
})

import { describe, expect, test } from "vitest"
import { CAVE_FLOOR, CHEST_HALT, EXIT_HALT, Run } from "@game/core/mecard"
import type { ConfirmDialog, Place, PlaceMove, PlaceType, Travel } from "@game/core/mecard"
import {
    BATTLE_TOPIC, BattleBroadcaster, BattleReceiver, LocalSync, TRAVEL_TOPIC, TravelBroadcaster,
    TravelReceiver, writeTravelMessage,
} from "@game/core/mecard/sync"
import type { SyncSender, TravelDesync } from "@game/core/mecard/sync"
import { started } from "../../sim/fixtures"

// --- Fixture builders ---

/** A main client telling the journey of a run, and a viewer listening to it, its drifts kept. */
function session(options: { held?: boolean, seed?: number } = {}) {
    const channel = new LocalSync(options.held ?? false)
    const run = new Run(options.seed ?? 11)
    const viewer = new TravelReceiver(new Run(0).travel, channel)
    const drifts: TravelDesync[] = []
    viewer.onDesync = desync => drifts.push(desync)
    const broadcaster = new TravelBroadcaster(run.travel, channel)
    return { channel, run, viewer, drifts, broadcaster }
}

/** A channel writing what is sent down, no viewer ever connecting. */
function writingTo(sent: string[]): SyncSender {
    return { send: message => sent.push(message), onPeer: () => ({ dispose() {} }) }
}

/** The rank of the place the party stands on. */
function rankOf(travel: Travel): number {
    return travel.place ? travel.journey.places.indexOf(travel.place) : -1
}

/** A place of a sort on the map, the first there. */
function placeOf(travel: Travel, type: PlaceType): Place {
    const place = travel.journey.places.find(each => each.type === type)
    if(!place) throw new Error(`The map has no ${type.id}.`)
    return place
}

/** Visit a halt and leave it. */
function visitAndLeave(run: Run): void {
    run.travel.visit(CHEST_HALT)
    run.travel.leave()
}

/** A journey, as text. */
function textOf(travel: Travel): string {
    return JSON.stringify(travel.save())
}

// --- Tests ---

describe("TravelReceiver", () => {
    test("a journey told → as it stands, at once", () => {
        const { run, viewer } = session()
        expect(textOf(viewer.engine)).toBe(textOf(run.travel))
    })

    test("the party moves → the viewer's journey tells the same move, where the party went", () => {
        const { run, viewer } = session()
        const moves: PlaceMove[] = []
        viewer.engine.moved.add(move => moves.push(move))
        const [first] = run.travel.next
        run.travel.go(first)
        expect(rankOf(viewer.engine)).toBe(rankOf(run.travel))
        expect(moves).toHaveLength(1)
        expect(moves[0].from).toBe(null)
        expect(moves[0].to).toBe(viewer.engine.place)
    })

    test("a move → the depth follows", () => {
        const { run, viewer } = session()
        run.travel.go(run.travel.next[0])
        run.travel.enter()
        run.backToMap()
        run.travel.go(run.travel.next[0])
        expect(run.travel.depth).toBe(2)
        expect(viewer.engine.depth).toBe(2)
    })

    test("a halt visited, not left yet → nothing sent", () => {
        const { run, viewer } = session()
        let loads = 0
        viewer.engine.loaded.add(() => loads++)
        run.travel.visit(CHEST_HALT)
        expect(loads).toBe(0)
    })

    test("an exit taken → the new floor and its map, no drift", () => {
        const { run, viewer, drifts } = session()
        const exit = placeOf(run.travel, EXIT_HALT)
        run.travel.jump(exit)
        run.travel.visit(EXIT_HALT)
        const [dialog] = run.travel.dialogs
        run.travel.accept(dialog as ConfirmDialog)
        expect(run.travel.floor.level).toBe(2)
        expect(viewer.engine.floor.level).toBe(2)
        expect(viewer.engine.place).toBe(null)
        expect(textOf(viewer.engine)).toBe(textOf(run.travel))
        expect(drifts).toEqual([])
    })

    test("another journey told → loaded, no drift", () => {
        const { viewer, broadcaster, drifts } = session()
        const next = new Run(12)
        broadcaster.engine = next.travel
        expect(textOf(viewer.engine)).toBe(textOf(next.travel))
        expect(drifts).toEqual([])
    })

    test("a move lost, then a halt left → a drift told, the viewer caught up", () => {
        const { channel, run, viewer, drifts } = session()
        viewer.dispose()
        run.travel.jump(run.travel.next[0])
        channel.listen(text => viewer.receive(text))
        visitAndLeave(run)
        expect(drifts).toEqual([{ number: 1, sequence: 3 }])
        expect(rankOf(viewer.engine)).toBe(rankOf(run.travel))
    })

    test("a move before any save → ignored, the next save taken in", () => {
        const viewer = new TravelReceiver(new Run(0).travel, new LocalSync())
        viewer.receive(writeTravelMessage({ kind: "moved", number: 1, sequence: 2, from: null, to: 0, depth: 1 }))
        expect(viewer.engine.place).toBe(null)
        const save = new Run(1).travel.save()
        let loads = 0
        viewer.engine.loaded.add(() => loads++)
        viewer.receive(writeTravelMessage({ kind: "save", number: 1, sequence: 3, save }))
        expect(loads).toBe(1)
    })

    test("a message older than the one heard → ignored", () => {
        const viewer = new TravelReceiver(new Run(0).travel, new LocalSync())
        const save = new Run(1).travel.save()
        let loads = 0
        viewer.engine.loaded.add(() => loads++)
        viewer.receive(writeTravelMessage({ kind: "save", number: 1, sequence: 2, save }))
        viewer.receive(writeTravelMessage({ kind: "save", number: 1, sequence: 1, save }))
        expect(loads).toBe(1)
    })

    test("a message in another shape → told to onError, nothing loaded", () => {
        const viewer = new TravelReceiver(new Run(0).travel, new LocalSync())
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        viewer.receive("{\"kind\":\"hello\"}")
        expect(errors).toHaveLength(1)
    })

    test("a place the map does not have → told to onError", () => {
        const { viewer } = session()
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        viewer.receive(writeTravelMessage({ kind: "moved", number: 1, sequence: 5, from: null, to: 9999, depth: 1 }))
        expect(errors).toHaveLength(1)
    })

    test("late → the moves come in order", () => {
        const { channel, run, viewer } = session({ held: true })
        channel.flush()
        const told: number[] = []
        const travel = viewer.engine
        travel.moved.add(({ to }) => told.push(travel.journey.places.indexOf(to)))
        run.travel.jump(run.travel.next[0])
        const first = rankOf(run.travel)
        run.travel.jump(run.travel.next[0])
        const second = rankOf(run.travel)
        expect(told).toEqual([])
        channel.flush()
        expect(told).toEqual([first, second])
    })
})

describe("TravelBroadcaster", () => {
    test("disposed → sends nothing", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const run = new Run(2)
        const broadcaster = new TravelBroadcaster(run.travel, channel)
        broadcaster.dispose()
        run.travel.jump(run.travel.next[0])
        expect(sent).toHaveLength(1)
    })

    test("a halt left → the journey sent once", () => {
        const sent: string[] = []
        const run = new Run(2)
        new TravelBroadcaster(run.travel, writingTo(sent))
        run.travel.visit(CHEST_HALT)
        run.backToMap()
        expect(sent).toHaveLength(2)
    })

    test("a viewer connecting after a move → hears what stands, not the move", () => {
        const channel = new LocalSync()
        const run = new Run(2)
        new TravelBroadcaster(run.travel, channel)
        run.travel.jump(run.travel.next[0])
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toHaveLength(1)
        expect(heard[0]).toContain("\"save\"")
    })
})

describe("SyncTopic", () => {
    test("a battle and a journey on one channel → each hears its own, no error", () => {
        const channel = new LocalSync()
        const battles = new BattleReceiver(new Run(0).newBattle(), BATTLE_TOPIC.source(channel))
        const journeys = new TravelReceiver(new Run(0).travel, TRAVEL_TOPIC.source(channel))
        const errors: unknown[] = []
        battles.onError = error => errors.push(error)
        journeys.onError = error => errors.push(error)
        const run = new Run(11)
        new TravelBroadcaster(run.travel, TRAVEL_TOPIC.sender(channel))
        new BattleBroadcaster(started(run), BATTLE_TOPIC.sender(channel))
        expect(errors).toEqual([])
    })

    test("a floor of the catalog → sent by name", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        new TravelBroadcaster(new Run(1).travel, TRAVEL_TOPIC.sender(channel))
        expect(sent[0].startsWith("travel:")).toBe(true)
        expect(sent[0]).toContain(CAVE_FLOOR.name)
    })
})

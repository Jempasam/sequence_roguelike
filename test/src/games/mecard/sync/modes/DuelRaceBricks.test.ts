import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { CHEST_HALT, DUEL_HALT, Run as RunClass, UPGRADE_FLOOR } from "@game/core/mecard"
import type { Run } from "@game/core/mecard"
import {
    ArrivalWatch, Contestant, Deadline, DuelLayerFault, DuelLayers, KICK_TO_DUEL, LifeBook, LocalSync,
    NoDuelAheadFault,
} from "@game/core/mecard/sync"
import type { Progress } from "@game/core/mecard/sync"
import { describe, expect, test, vi } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

function progress(atDuel: boolean): Progress {
    return { floor: 1, depth: 1, layer: 1, rows: 0, atDuel, inBattle: false, inHalt: false }
}

/** A watch over some players, with a time that moves by hand. */
function watching(ids: string[], arrivalMs = 1_000) {
    const timer = new ManualScheduler()
    const channel = new LocalSync()
    const deadline = new Deadline(timer, channel)
    const alive = [...ids]
    const watch = new ArrivalWatch(deadline, arrivalMs, () => alive)
    const log: string[] = []
    watch.started.add(ms => log.push(`started ${ms}`))
    watch.arrived.add(id => log.push(`arrived ${id}`))
    watch.late.add(id => log.push(`late ${id}`))
    watch.allArrived.add(() => log.push("all"))
    return { timer, deadline, watch, alive, log }
}

/** The rows of the map holding a halt of the duels. */
function duelRows(run: Run): number[] {
    const rows = run.travel.journey.places.filter(place => place.halt === DUEL_HALT).map(place => place.layer)
    return [...new Set(rows)].sort((a, b) => a - b)
}

/** The rows of the map where every place is a halt of the duels. */
function wholeDuelRows(run: Run): number[] {
    return run.travel.journey.layers
        .map((row, layer) => row.every(place => place.halt === DUEL_HALT) ? layer : -1)
        .filter(layer => layer >= 0)
}

// --- Tests ---

describe("ArrivalWatch", () => {
    test("the first to arrive → starts the one time limit, once, whoever comes after", () => {
        const { watch, deadline, log } = watching(["a", "b", "c"])
        watch.hear("a", progress(true))
        watch.hear("b", progress(true))
        expect(log).toEqual(["arrived a", "started 1000", "arrived b"])
        expect(deadline.isRunning).toBe(true)
    })

    test("everyone there → the time limit cancelled and everyone arrived, once", () => {
        const { watch, deadline, log } = watching(["a", "b"])
        watch.hear("a", progress(true))
        watch.hear("b", progress(true))
        watch.hear("b", progress(true))
        expect(log.filter(each => each === "all")).toHaveLength(1)
        expect(deadline.isRunning).toBe(false)
    })

    test("the time limit comes → each player not there is late, and no one else", () => {
        const { watch, timer, log } = watching(["a", "b", "c"])
        watch.hear("a", progress(true))
        timer.advance(1_000)
        expect(log.filter(each => each.startsWith("late"))).toEqual(["late b", "late c"])
    })

    test("late players that arrive after → everyone arrived then", () => {
        const { watch, timer, log } = watching(["a", "b"])
        watch.hear("a", progress(true))
        timer.advance(1_000)
        watch.hear("b", progress(true))
        expect(log.at(-1)).toBe("all")
    })

    test("a player that is out → not waited for", () => {
        const { watch, alive, log } = watching(["a", "b"])
        watch.hear("a", progress(true))
        alive.splice(alive.indexOf("b"), 1)
        watch.check()
        expect(log.at(-1)).toBe("all")
    })

    test("a progress of a player that is out, or not at the duels → arrives nothing", () => {
        const { watch, alive, log } = watching(["a", "b"])
        alive.splice(alive.indexOf("b"), 1)
        watch.hear("b", progress(true))
        watch.hear("a", progress(false))
        expect(log).toEqual([])
    })

    test("reset → nobody is there and no time runs, for the round after", () => {
        const { watch, deadline } = watching(["a", "b"])
        watch.hear("a", progress(true))
        watch.reset()
        expect(deadline.isRunning).toBe(false)
        expect(watch.isThere("a")).toBe(false)
    })
})

describe("KICK_TO_DUEL", () => {
    test("a late player → one life lost, and sent to the duels", () => {
        const book = new LifeBook(["a", "b"], 3, new LocalSync())
        const kicked: string[] = []
        KICK_TO_DUEL.penalize("a", book, id => kicked.push(id))
        expect(book.livesOf("a")).toBe(2)
        expect(kicked).toEqual(["a"])
    })
})

describe("DuelLayers", () => {
    test("a map → a whole row of the duels every so many rows, none twice", () => {
        const run = startedRun(1)
        const layers = new DuelLayers(run, 3)
        layers.lay()
        // Each row laid moves the rows after it down by one.
        expect(duelRows(run)).toEqual([3, 7, 11])
        expect(wholeDuelRows(run)).toEqual([3, 7, 11])
    })

    test("a row of the duels → one behind each place of the row before, on from there as it went", () => {
        const plain = startedRun(1)
        const led = plain.travel.journey.layers[3].map(place => place.next.length)
        const run = startedRun(1)
        new DuelLayers(run, 4)
        const { layers } = run.travel.journey
        const [row] = duelRows(run)
        expect(layers[row]).toHaveLength(layers[row - 1].length)
        layers[row - 1].forEach((place, index) => {
            expect(place.next).toEqual([layers[row][index]])
            expect(layers[row][index].next.length).toBe(led[index])
        })
    })

    test("closing → a row past the last row of the map too", () => {
        const run = startedRun(1)
        const rows = run.travel.journey.layers.length - 1
        new DuelLayers(run, 100, true)
        expect(wholeDuelRows(run)).toEqual([rows])
    })

    test("a floor of upgrades, closing → one row of the duels at its end, and none before", () => {
        const run = new RunClass(1, undefined, UPGRADE_FLOOR)
        const rows = run.travel.journey.layers.length
        new DuelLayers(run, 100, true)
        expect(wholeDuelRows(run)).toEqual([rows])
        expect(run.travel.journey.layers).toHaveLength(rows + 1)
    })

    test("a map that holds the duels already → left as it is", () => {
        const run = startedRun(1)
        const layers = new DuelLayers(run, 4)
        const before = duelRows(run)
        layers.lay()
        expect(duelRows(run)).toEqual(before)
    })

    test("a floor entered → the map new, laid again", () => {
        const run = startedRun(1)
        new DuelLayers(run, 4)
        run.travel.redrawMap()
        run.travel.floorEntered.notify(run.travel.floor)
        expect(duelRows(run)).toEqual([4, 9])
    })

    test("a row that cannot hold one → skipped, told, the others laid", () => {
        const run = startedRun(1)
        const real = run.travel.layLayer.bind(run.travel)
        vi.spyOn(run.travel, "layLayer").mockImplementation((type, layer) => {
            if(layer === 4) throw new Error("no room")
            return real(type, layer)
        })
        const layers = new DuelLayers(run, 4)
        const faults: Fault[] = []
        layers.faulted.add(fault => faults.push(fault))
        run.travel.redrawMap()
        layers.lay()
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(DuelLayerFault)
        expect(duelRows(run)).toEqual([8])
    })
})

describe("Contestant", () => {
    function contested(every = 3) {
        const run = startedRun(2)
        new DuelLayers(run, every)
        let arrivedAnyway = 0
        const contestant = new Contestant(run, () => arrivedAnyway++)
        const log: string[] = []
        contestant.kicked.add(() => log.push("kicked"))
        contestant.resumed.add(() => log.push("resumed"))
        contestant.faulted.add(fault => log.push(fault.constructor.name))
        return { run, contestant, log, arrived: () => arrivedAnyway }
    }

    test("a party on the map → taken to the halt of the duels, which holds it until released", () => {
        const { run, contestant, log } = contested()
        contestant.kick()
        expect(contestant.waitingAt).not.toBeNull()
        expect(run.travel.halt?.locked).toBe(true)
        expect(log).toEqual(["kicked"])
        contestant.resume()
        expect(run.travel.halt?.locked).toBe(false)
        expect(log).toEqual(["kicked", "resumed"])
    })

    test("a party in a visit → the visit left, and it is taken there", () => {
        const { run, contestant } = contested()
        run.travel.visit(CHEST_HALT)
        expect(run.travel.phase).toBe("visit")
        contestant.kick()
        expect(contestant.waitingAt).not.toBeNull()
    })

    test("a party in a fight → the battle abandoned, no defeat", () => {
        const { run, contestant } = contested()
        let defeats = 0
        run.defeated.add(() => defeats++)
        const fightPlace = run.travel.next.find(place => place.fight !== null)!
        run.travel.go(fightPlace)
        run.travel.advance()
        run.advance()
        expect(run.battle).not.toBeNull()
        contestant.kick()
        expect(run.battle).toBeNull()
        expect(defeats).toBe(0)
        expect(contestant.waitingAt).not.toBeNull()
    })

    test("a party already waiting → left as it is, nothing told", () => {
        const { run, contestant, log } = contested()
        contestant.kick()
        const halt = run.travel.halt
        contestant.kick()
        expect(run.travel.halt).toBe(halt)
        expect(log).toEqual(["kicked"])
    })

    test("no halt of the duels ahead → no move, a NoDuelAheadFault, counted as arrived anyway", () => {
        const { run, contestant, log, arrived } = contested(100)
        contestant.kick()
        expect(log).toEqual([NoDuelAheadFault.name])
        expect(arrived()).toBe(1)
        expect(run.phase).toBe("travel")
        expect(contestant.waitingAt).toBeNull()
    })

    test("let go when it waits nowhere → nothing happens", () => {
        const { contestant, log } = contested()
        contestant.resume()
        expect(log).toEqual([])
    })
})

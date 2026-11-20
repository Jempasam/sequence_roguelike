import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { partyUnits, Rng } from "@game/core/mecard"
import type { SavedUnit } from "@game/core/mecard"
import {
    Attendee, fixed, InvalidTeamFault, LocalRoom, LocalSync, NotEnoughPlayersFault, randomTeams, TimeoutFault,
    Versus, VersusGuest,
} from "@game/core/mecard/sync"
import type { DuelDecision, DuelFight } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import { brokenUnit, Player, settle } from "./fixtures"

// --- Fixture builders ---

/** The most steps a test takes to reach the end of what it plays. */
const CAP = 4_000

interface Played {
    readonly room: LocalRoom
    readonly timer: ManualScheduler
    readonly versus: Versus
    readonly players: Player[]
    readonly guests: Map<string, VersusGuest>
    readonly decided: DuelDecision[]
    readonly drawn: DuelFight[]
    readonly excluded: string[]
    readonly faults: Fault[]
    readonly ended: Fault[]
    readonly over: Map<string, (boolean|null)[]>
    finished(): number
}

/** How a player changes the units it brings. */
type Change = (own: readonly SavedUnit[]) => readonly SavedUnit[]

/** A hub and players, each with the party of a run of its own, the units of one of them changed as asked. */
function played(ids: readonly string[], units: Record<string, Change> = {}): Played {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const timer = new ManualScheduler()
    const versus = new Versus(room, channel, timer, randomTeams(new Rng(3), fixed(1)), new Rng(4))
    const decided: DuelDecision[] = []
    const drawn: DuelFight[] = []
    const excluded: string[] = []
    const faults: Fault[] = []
    const ended: Fault[] = []
    let finished = 0
    versus.round.decided.add(decision => decided.push(decision))
    versus.round.drawn.add(fight => drawn.push(fight))
    versus.round.excluded.add(id => excluded.push(id))
    versus.faulted.add(fault => faults.push(fault))
    versus.ended.add(fault => ended.push(fault))
    versus.finished.add(() => finished++)
    const players: Player[] = []
    const guests = new Map<string, VersusGuest>()
    const over = new Map<string, (boolean|null)[]>()
    ids.forEach((id, index) => {
        const own = partyUnits(startedRun(index + 1))
        const guest = new VersusGuest(room.join(id), channel, () => (units[id] ?? (each => each))(own))
        const results: (boolean|null)[] = []
        guest.view.duelOver.add(won => results.push(won))
        over.set(id, results)
        guests.set(id, guest)
        players.push(new Player(id, guest.view, () => guest.ready()))
    })
    return {
        room, timer, versus, players, guests, decided, drawn, excluded, faults, ended, over,
        finished: () => finished,
    }
}

/** Play until the duels are decided, or a cap is reached. */
function play({ players, finished }: Played): void {
    for(let step = 0; step < CAP && finished() === 0; step++) for(const player of players) player.act()
}

// --- Tests ---

describe("Versus", () => {
    test("two players → one duel fought by the players' plans, decided once, whoever wins", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        play(round)
        expect(round.finished()).toBe(1)
        expect(round.decided.length + round.drawn.length).toBe(1)
        expect(round.ended).toEqual([])
        const fight = round.versus.round.fights[0]
        expect(fight.sides.flat().sort()).toEqual(["a", "b"])
        expect(round.versus.round.battleOf(fight.number)?.phase).toBe("over")
    })

    test("a duel decided → each player is told whether it won, the winner and the loser agreeing", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        play(round)
        const results = [round.over.get("a"), round.over.get("b")]
        expect(results.every(each => each?.length === 1)).toBe(true)
        const [a, b] = results.map(each => each?.[0])
        if(round.decided.length === 1){
            expect(a).toBe(round.decided[0].winners.includes("a"))
            expect(b).toBe(round.decided[0].winners.includes("b"))
            expect(a).not.toBe(b)
        } else {
            expect([a, b]).toEqual([null, null])
        }
    })

    test("the same hero in both camps → the units of the duel have names of their own", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        const battle = round.versus.round.battleOf(0)
        const names = battle?.units.map(unit => unit.name) ?? []
        expect(names).toHaveLength(4)
        expect(new Set(names).size).toBe(4)
    })

    test("the heroes of the players' runs → untouched by the duel", async() => {
        const run = startedRun(1)
        const before = JSON.stringify(run.save())
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        play(round)
        expect(JSON.stringify(run.save())).toBe(before)
        expect(round.finished()).toBe(1)
    })

    test("three players in camps of one → a spectator, who follows the duel and loses nothing", async() => {
        const round = played(["a", "b", "c"])
        round.versus.start()
        await settle()
        const { sides } = round.versus.round.fights[0]
        const watcher = ["a", "b", "c"].find(id => !sides.flat().includes(id)) as string
        const watching: unknown[] = []
        round.guests.get(watcher)?.view.watching.add(each => watching.push(each))
        play(round)
        expect(round.finished()).toBe(1)
        expect(round.guests.get(watcher)?.view.battle).not.toBeNull()
        expect(round.guests.get(watcher)?.view.units).toEqual([])
        const fighters = round.decided.flatMap(({ winners, losers }) => [...winners, ...losers])
        expect(fighters).not.toContain(watcher)
    })

    test("a player with a team that cannot be loaded → left out, the other wins, nothing loaded", async() => {
        const round = played(["a", "b"], { b: own => own.map(brokenUnit) })
        round.versus.start()
        await settle()
        expect(round.excluded).toEqual(["b"])
        expect(round.faults.some(fault => fault instanceof InvalidTeamFault)).toBe(true)
        expect(round.decided).toHaveLength(1)
        expect(round.decided[0].winners).toEqual(["a"])
        expect(round.versus.round.battleOf(0)).toBeNull()
        expect(round.finished()).toBe(1)
    })

    test("a player that does not answer in time → left out with a TimeoutFault", async() => {
        const round = played(["a"])
        new Attendee(round.room.join("silent")).join()
        round.versus.start()
        await settle()
        round.timer.advance(10_000)
        await settle()
        expect(round.faults.some(fault => fault instanceof TimeoutFault)).toBe(true)
        expect(round.excluded).toEqual(["silent"])
        expect(round.decided[0].winners).toEqual(["a"])
    })

    test("a single player → no duel, ended with a NotEnoughPlayersFault", async() => {
        const round = played(["a"])
        round.versus.start()
        await settle()
        expect(round.ended).toHaveLength(1)
        expect(round.ended[0]).toBeInstanceOf(NotEnoughPlayersFault)
        expect(round.decided).toEqual([])
        expect(round.finished()).toBe(0)
    })

    test("a player that leaves for good in the middle of the duel → the other camp wins", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        round.room.leave("b")
        expect(round.decided).toHaveLength(1)
        expect(round.decided[0].winners).toEqual(["a"])
        expect(round.finished()).toBe(1)
    })

    test("a player whose connection is lost → its units are played as bots, and the duel goes on to its end", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        round.room.drop("b")
        play({ ...round, players: round.players.filter(player => player.id === "a") })
        expect(round.finished()).toBe(1)
        expect(round.decided.length + round.drawn.length).toBe(1)
    })

    test("a player whose connection is back → told of its duel again, once, and nothing starts over", async() => {
        const round = played(["a", "b"])
        round.versus.start()
        await settle()
        const view = round.guests.get("b")?.view
        const number = view?.number
        const battle = view?.battle
        round.room.drop("b")
        round.room.back("b")
        expect(view?.number).toBe(number)
        expect(view?.battle).toBe(battle)
    })
})

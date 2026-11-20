import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { DUEL_HALT, Rng } from "@game/core/mecard"
import type { Run } from "@game/core/mecard"
import {
    DuelRaceGuest, DuelRaceHost, duelRules, fixed, LocalRoom, LocalSync, NotEnoughPlayersFault, randomTeams,
    shrinking,
} from "@game/core/mecard/sync"
import type { DuelDecision, Matched, TeamSize } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import { Player, settle } from "./fixtures"

// --- Fixture builders ---

/** The most steps a test takes to reach the end of a race. */
const CAP = 3_000

/** What a test changes in the rules of a race. */
interface Options {
    readonly lives?: number
    readonly teamSize?: TeamSize
    readonly idle?: readonly string[]
}

interface Race {
    readonly room: LocalRoom
    readonly timer: ManualScheduler
    readonly host: DuelRaceHost
    readonly runs: Map<string, Run>
    readonly guests: Map<string, DuelRaceGuest>
    readonly players: Map<string, Player>
    readonly idle: ReadonlySet<string>

    /** The lives each player had after each change, in order, from the first. */
    readonly history: Map<string, number[]>
    readonly won: string[]
    readonly matched: Matched[]
    readonly decided: DuelDecision[]
    readonly faults: Fault[]
    readonly rounds: number[]
    readonly eliminated: string[]
    readonly guestWon: string[]
    finished(): number
}

/** A hub and bots, each playing a run of its own, and a lobby that started the race. */
function racing(ids: readonly string[], options: Options = {}): Race {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const timer = new ManualScheduler()
    const teamSize = options.teamSize ?? fixed(1)
    const lives = options.lives ?? 2
    const rules = duelRules(new Rng(5), {
        lives, duelEvery: 2, arrivalMs: 1_000, teamSize, matching: randomTeams(new Rng(6), teamSize),
    })
    const host = new DuelRaceHost(rules, room, channel, timer, new Rng(7))
    const history = new Map<string, number[]>(ids.map(id => [id, [lives]]))
    const won: string[] = []
    const matched: Matched[] = []
    const decided: DuelDecision[] = []
    const faults: Fault[] = []
    const rounds: number[] = []
    const eliminated: string[] = []
    const guestWon: string[] = []
    let finished = 0
    host.won.add(id => won.push(id))
    host.finished.add(() => finished++)
    host.faulted.add(fault => faults.push(fault))
    host.roundStarted.add(round => {
        rounds.push(round)
        host.round?.matched.add(each => matched.push(each))
        host.round?.decided.add(each => decided.push(each))
    })
    const runs = new Map<string, Run>()
    const guests = new Map<string, DuelRaceGuest>()
    const players = new Map<string, Player>()
    ids.forEach((id, index) => {
        const run = startedRun(index + 1)
        const guest = new DuelRaceGuest(rules, room.join(id), channel, timer, run, id)
        guest.eliminated.add(() => eliminated.push(id))
        guest.won.add(winner => guestWon.push(winner))
        runs.set(id, run)
        guests.set(id, guest)
        players.set(id, new Player(id, guest.view, () => guest.ready()))
    })
    host.start()
    host.lifeBook?.lifeLost.add(({ id, left }) => history.get(id)?.push(left))
    return {
        room, timer, host, runs, guests, players, idle: new Set(options.idle ?? []), history, won, matched,
        decided, faults, rounds, eliminated, guestWon, finished: () => finished,
    }
}

/** A bot reaches the next halt of the duels of its map, unless it dawdles, or already waits at one. */
function walk(race: Race, id: string): void {
    const run = race.runs.get(id)
    const guest = race.guests.get(id)
    if(!run || !guest || race.idle.has(id) || guest.contestant.waitingAt) return
    if(!race.host.lifeBook?.isAlive(id)) return
    const { travel } = run
    if(travel.phase === "visit") travel.leave()
    if(travel.phase !== "map") return
    const place = travel.nextPlaceOf(DUEL_HALT)
    if(!place) return
    travel.jump(place)
    travel.haltOf(place)
    travel.go(place)
    travel.enter()
}

/** Is the race over, one way or the other? */
function isOver(race: Race): boolean {
    return race.won.length + race.finished() > 0
}

/** Play the race to its end, or to a cap: the bots walk, the players plan, the time moves. */
async function playOut(race: Race, until: (race: Race) => boolean = isOver): Promise<void> {
    for(let step = 0; step < CAP && !until(race); step++){
        for(const id of race.runs.keys()) walk(race, id)
        await settle()
        for(const player of race.players.values()) player.act()
        race.timer.advance(100)
        await settle()
    }
}

/** What the heroes of a run are, in what the race may not change. */
function heroesOf(run: Run): string {
    return JSON.stringify(run.heroes.map(hero => ({
        name: hero.name,
        hearts: hero.hearts.map(heart => heart.isEmpty),
        decks: hero.decks.map(deck => deck.length),
    })))
}

// --- Tests ---

describe("DuelRace", () => {
    test("two players → a race that ends with a winner or none, the lives only falling, never under none", async() => {
        const race = racing(["a", "b"])
        await playOut(race)
        expect(isOver(race)).toBe(true)
        expect(race.won.length + race.finished()).toBe(1)
        for(const [, lives] of race.history){
            expect(lives.every((each, index) => index === 0 || each === lives[index - 1] - 1)).toBe(true)
            expect(Math.min(...lives)).toBeGreaterThanOrEqual(0)
        }
        expect(race.host.lifeBook?.alive().length ?? 2).toBeLessThanOrEqual(1)
    })

    test("a race that ends → the players hear it, the winner among those who were in", async() => {
        const race = racing(["a", "b", "c"], { lives: 1 })
        await playOut(race)
        const winner = race.won[0] ?? null
        expect(race.guestWon).toEqual(winner === null ? [] : Array(3).fill(winner))
        if(winner !== null) expect(race.host.lifeBook?.alive()).toEqual([winner])
    })

    test("a player that is out → told so, no more in a duel, and it watches the duels that follow", async() => {
        const race = racing(["a", "b", "c"], { lives: 1 })
        await playOut(race)
        const [first] = race.eliminated
        expect(first).toBeDefined()
        const out = race.guests.get(first)
        const index = race.decided.findIndex(({ losers }) => losers.includes(first))
        for(const { fight } of race.decided.slice(index + 1)) expect(fight.sides.flat()).not.toContain(first)
        // Three players leave one round after the first falls: the one out watches it.
        expect(out?.view.number ?? 0).toBeGreaterThanOrEqual(2_000)
        expect(out?.view.units).toEqual([])
    })

    test("a player that dawdles → late once the first arrived, one life lost, and waiting at the duels", async() => {
        const race = racing(["a", "b"], { lives: 3, idle: ["b"] })
        await playOut(race, each => each.rounds.length > 0)
        expect(race.history.get("b")?.slice(0, 2)).toEqual([3, 2])
        expect(race.history.get("a")?.length).toBe(1)
        expect(race.guests.get("b")?.contestant.waitingAt ?? race.runs.get("b")?.travel.halt).not.toBeNull()
        expect(race.runs.get("b")?.travel.halt?.type).toBe(DUEL_HALT)
    })

    test("three players, camps shrinking → one against one, and a single spectator who loses nothing", async() => {
        const race = racing(["a", "b", "c"], { lives: 3, teamSize: shrinking(2) })
        await playOut(race, each => each.matched.length > 0 && each.decided.length > 0)
        const [first] = race.matched
        expect(first.fights).toHaveLength(1)
        expect(first.fights[0].sides.map(side => side.length)).toEqual([1, 1])
        expect(first.watchers.size).toBe(1)
        const [watcher] = [...first.watchers.keys()]
        expect(race.history.get(watcher)).toEqual([3])
        expect(race.guests.get(watcher)?.view.battle).not.toBeNull()
    })

    test("five players in camps of two → one spectator in the first round", async() => {
        const race = racing(["a", "b", "c", "d", "e"], { lives: 3, teamSize: fixed(2) })
        await playOut(race, each => each.matched.length > 0)
        expect(race.matched[0].fights).toHaveLength(1)
        expect(race.matched[0].watchers.size).toBe(1)
    })

    test("a duel fought → the heroes of the runs are untouched", async() => {
        const race = racing(["a", "b"], { lives: 3 })
        const before = new Map([...race.runs].map(([id, run]) => [id, heroesOf(run)]))
        await playOut(race, each => each.decided.length > 0)
        for(const [id, run] of race.runs) expect(heroesOf(run)).toBe(before.get(id))
    })

    test("the duel fought → each player is let go, and no duel waits for the others", async() => {
        const race = racing(["a", "b"], { lives: 3 })
        await playOut(race, each => each.decided.length > 0)
        await playOut(race, each => each.rounds.length > 0 && each.host.round === null)
        for(const id of ["a", "b"]){
            const halt = race.runs.get(id)?.travel.halt
            expect(halt?.locked).toBe(false)
        }
    })

    test("a player that leaves for good → out, and the last one left wins", async() => {
        const race = racing(["a", "b", "c"], { lives: 3 })
        race.room.leave("b")
        race.room.leave("c")
        expect(race.won).toEqual(["a"])
        expect(race.guestWon).toEqual(["a", "a", "a"].slice(0, race.guestWon.length))
    })

    test("everyone leaves → finished, nobody won", async() => {
        const race = racing(["a", "b"], { lives: 3 })
        race.room.leave("a")
        race.room.leave("b")
        expect(race.finished() + race.won.length).toBe(1)
    })

    test("a player whose connection is lost → the time goes on, and it is late as any", async() => {
        const race = racing(["a", "b"], { lives: 3 })
        race.room.drop("b")
        await playOut(race, each => each.rounds.length > 0)
        expect(race.history.get("b")?.[1]).toBe(2)
        expect(race.faults.some(fault => fault.describe().includes("connection"))).toBe(true)
    })

    test("a lobby of one → no race: ended with a NotEnoughPlayersFault", () => {
        const room = new LocalRoom()
        const channel = new LocalSync()
        const timer = new ManualScheduler()
        const rules = duelRules(new Rng(1))
        const host = new DuelRaceHost(rules, room, channel, timer, new Rng(2))
        const ended: Fault[] = []
        host.ended.add(fault => ended.push(fault))
        new DuelRaceGuest(rules, room.join("only"), channel, timer, startedRun(1), "only")
        host.start()
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(NotEnoughPlayersFault)
        expect(host.lifeBook).toBeNull()
    })
})

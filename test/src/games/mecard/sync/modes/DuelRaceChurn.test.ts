import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { DUEL_HALT, Rng } from "@game/core/mecard"
import type { Run } from "@game/core/mecard"
import {
    DuelRaceGuest, DuelRaceHost, duelRules, fixed, LocalRoom, LocalSync, randomTeams, SeatPicker,
} from "@game/core/mecard/sync"
import type { SeatOffer, SyncLink } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import { Player, settle } from "./fixtures"

// --- Fixture builders ---

const LIVES = 3
const RESERVE_MS = 15_000
const VACANT_MS = 30_000

/** One client of the race: what it plays with, and what plays for it. */
interface Client {
    readonly id: string

    /** Its connection, which stays the same when it quits the game and comes back to it. */
    readonly link: SyncLink
    readonly run: Run
    readonly guest: DuelRaceGuest
    readonly player: Player
    readonly picker: SeatPicker
    isPlaying: boolean
}

/** A race with players that come, quit, are lost, come back and leave, and bots that walk to the duels. */
class Churn {


    public readonly room = new LocalRoom()
    public readonly channel = new LocalSync()
    public readonly timer = new ManualScheduler()
    public readonly host: DuelRaceHost
    public readonly faults: Fault[] = []
    public readonly won: string[] = []
    public readonly finished: number[] = []
    public readonly clients = new Map<string, Client>()

    /** Every life ever lost, by lane, with the lives left after it: they only go down. */
    public readonly lanesHistory = new Map<string, number[]>()

    constructor(ids: readonly string[]){
        const teamSize = fixed(1)
        const rules = duelRules(new Rng(5), {
            lives: LIVES, duelEvery: 2, arrivalMs: 1_000, teamSize, matching: randomTeams(new Rng(6), teamSize),
            reserveMs: RESERVE_MS, vacantMs: VACANT_MS,
        })
        this.#rules = rules
        this.host = new DuelRaceHost(rules, this.room, this.channel, this.timer, new Rng(7))
        this.host.faulted.add(fault => this.faults.push(fault))
        this.host.won.add(id => this.won.push(id))
        this.host.finished.add(() => this.finished.push(1))
        for(const id of ids) this.come(id)
        this.host.start()
    }


    /** Is the race over, one way or the other? */
    public get isOver(): boolean { return this.won.length + this.finished.length > 0 }

    /** A client comes, with a run of its own, as the lobby makes a new guest each time. */
    public come(id: string): Client {
        const old = this.clients.get(id)
        if(old) old.guest.dispose()
        const run = startedRun(++this.#runs)
        // The same connection plays again, as one that quit and comes back to the game does.
        const link = old?.link ?? this.room.join(id)
        const guest = new DuelRaceGuest(this.#rules, link, this.channel, this.timer, run, id)
        const picker = old?.picker ?? new SeatPicker(this.room.join(`${id}-eye`), this.channel)
        const client: Client = {
            id, link, run, guest, picker, player: new Player(id, guest.view, () => guest.ready()), isPlaying: true,
        }
        this.clients.set(id, client)
        return client
    }

    /** What the host holds for a client: playing a lane, or only watching. */
    public roleOf(id: string): "player"|"spectator"|null {
        return this.clients.get(id)?.guest.attendee.participation?.role ?? null
    }

    /** The lane a client plays, none when it plays none. */
    public laneOf(id: string): string|null {
        return this.host.lanes.laneOf(id)
    }

    /** A client leaves the game, and stays in the room. */
    public quit(id: string): void {
        const client = this.clients.get(id)
        if(!client) return
        client.guest.quit()
        client.isPlaying = false
    }

    /** A client leaves the room for good. */
    public leaveRoom(id: string): void {
        this.room.leave(id)
        const client = this.clients.get(id)
        if(client) client.isPlaying = false
    }

    /** The lives of the lane of a player, none for one that plays none. */
    public lives(id: string): number {
        return this.host.lifeBook?.livesOf(id) ?? 0
    }

    /** The bots reach the next halt of the duels of their maps. */
    public walk(): void {
        for(const client of this.clients.values()){
            const { run, guest, id } = client
            if(!client.isPlaying || guest.contestant.waitingAt) continue
            if(this.roleOf(id) !== "player" || !this.host.lifeBook?.isAlive(id)) continue
            const { travel } = run
            if(travel.phase === "visit") travel.leave()
            if(travel.phase !== "map") continue
            const place = travel.nextPlaceOf(DUEL_HALT)
            if(!place){
                // The end of the map: no halt of the duels ahead, which the player says as it would be told.
                guest.contestant.kick()
                continue
            }
            travel.jump(place)
            travel.haltOf(place)
            travel.go(place)
            travel.enter()
        }
    }

    /** One step of the race: the bots walk, the players plan, the time moves. */
    public async step(ms = 100): Promise<void> {
        this.walk()
        await settle()
        for(const client of this.clients.values()) if(client.isPlaying) client.player.act()
        this.timer.advance(ms)
        await settle()
        this.#record()
    }

    /** Play until something holds, or a cap is reached. */
    public async until(done: () => boolean, cap = 4_000): Promise<void> {
        for(let step = 0; step < cap && !done(); step++) await this.step()
    }

    /** What the lives were after each change, per lane, from what the hub keeps. */
    #record(): void {
        const book = this.host.lifeBook
        if(!book) return
        for(const lane of ["lane-1", "lane-2", "lane-3", "lane-4", "lane-5", "lane-6"]){
            const history = this.lanesHistory.get(lane) ?? []
            const lives = book.livesOfLane(lane)
            if(history.at(-1) !== lives) history.push(lives)
            this.lanesHistory.set(lane, history)
        }
    }


    readonly #rules: ReturnType<typeof duelRules>
    #runs = 0
}

/** The seats offer last heard by the client of a player, as the hub told it. */
function offerSeenBy(churn: Churn, id: string): SeatOffer|null {
    return churn.clients.get(id)?.picker.offer ?? null
}

// --- Tests ---

describe("a race where places change hands", () => {
    test("a player quits → its lane is kept for it, and shown to everyone as kept, then as open", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        expect(race.laneOf("b")).toBe("lane-2")
        expect(race.host.lanes.vacant).toEqual(["lane-2"])
        expect(offerSeenBy(race, "a")?.reserved).toEqual({ "lane-2": "b" })
        race.timer.advance(RESERVE_MS)
        expect(offerSeenBy(race, "a")?.reserved).toEqual({})
        expect(offerSeenBy(race, "a")?.held).toEqual({ "lane-1": "a", "lane-3": "c" })
    })

    test("someone else comes while the lane is kept → only watches, and the one that left keeps its place", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        race.come("z")
        expect(race.roleOf("z")).toBe("spectator")
        expect(race.laneOf("z")).toBeNull()
        race.timer.advance(5_000)
        race.come("b")
        expect(race.roleOf("b")).toBe("player")
        expect(race.laneOf("b")).toBe("lane-2")
        expect(race.lives("b")).toBe(LIVES)
    })

    test("someone else comes once the lane is open → takes it, with its lives, and the one that left is out", () => {
        const race = new Churn(["a", "b", "c"])
        race.host.lifeBook?.lose("b")
        race.quit("b")
        race.timer.advance(RESERVE_MS)
        race.come("z")
        expect(race.roleOf("z")).toBe("player")
        expect(race.laneOf("z")).toBe("lane-2")
        expect(race.lives("z")).toBe(LIVES - 1)
        expect(race.lives("b")).toBe(0)
        expect(race.host.lifeBook?.alive()).toEqual(["a", "z", "c"])
        // The lane is held: nothing is left to expire.
        race.timer.advance(VACANT_MS * 2)
        expect(race.lives("z")).toBe(LIVES - 1)
        expect(race.host.lanes.vacant).toEqual([])
    })

    test("a spectator that asks again once a lane is open → takes it", () => {
        const race = new Churn(["a", "b"])
        race.come("z")
        expect(race.roleOf("z")).toBe("spectator")
        race.quit("b")
        race.timer.advance(RESERVE_MS)
        // Asks again with a client of its own, as the lobby makes one each time.
        race.come("z")
        expect(race.roleOf("z")).toBe("player")
        expect(race.laneOf("z")).toBe("lane-2")
    })

    test("a player and the one that left come back together, once the lane is open → one lane, one player", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        race.timer.advance(RESERVE_MS)
        race.come("y")
        race.come("z")
        expect([race.roleOf("y"), race.roleOf("z")].sort()).toEqual(["player", "spectator"])
        expect(race.host.lanes.vacant).toEqual([])
    })

    test("the place changes hands twice → the same lane, the same lives, one after the other", () => {
        const race = new Churn(["a", "b", "c"])
        race.host.lifeBook?.lose("c")
        race.quit("c")
        race.timer.advance(RESERVE_MS)
        race.come("y")
        expect(race.laneOf("y")).toBe("lane-3")
        race.quit("y")
        race.timer.advance(RESERVE_MS)
        race.come("z")
        expect(race.laneOf("z")).toBe("lane-3")
        expect(race.lives("z")).toBe(LIVES - 1)
        expect(race.lives("y")).toBe(0)
        expect(race.lives("c")).toBe(0)
    })

    test("a player that leaves the room → its lane is taken as one that quit", () => {
        const race = new Churn(["a", "b", "c"])
        race.leaveRoom("b")
        expect(race.lives("b")).toBe(LIVES)
        race.timer.advance(RESERVE_MS)
        race.come("z")
        expect(race.laneOf("z")).toBe("lane-2")
        expect(race.lives("z")).toBe(LIVES)
    })

    test("nobody takes the lane → it is out once the time is over, and everyone is told", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        race.timer.advance(VACANT_MS)
        expect(race.host.lifeBook?.aliveLanes()).toEqual(["lane-1", "lane-3"])
        expect(offerSeenBy(race, "a")?.candidates).toEqual(["lane-1", "lane-3"])
        race.come("z")
        expect(race.roleOf("z")).toBe("spectator")
    })

    test("a player whose connection is lost while its lane is taken, then back → only watches", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        race.timer.advance(RESERVE_MS)
        race.come("z")
        race.room.drop("b")
        race.room.back("b")
        race.come("b")
        expect(race.roleOf("b")).toBe("spectator")
        expect(race.laneOf("z")).toBe("lane-2")
    })

    test("a lane taken in the middle of a round → the duel in progress counts for the lane, not for who left", async() => {
        const race = new Churn(["a", "b", "c", "d"])
        await race.until(() => race.host.round !== null)
        expect(race.host.round).not.toBeNull()
        const fighting = race.host.round?.fights.flatMap(fight => fight.sides.flat()) ?? []
        const [leaver] = fighting
        const lane = race.laneOf(leaver)
        expect(lane).not.toBeNull()
        race.quit(leaver)
        race.timer.advance(RESERVE_MS)
        race.come("z")
        expect(race.laneOf("z")).toBe(lane)
        await race.until(() => race.host.round === null)
        const lives = race.host.lifeBook?.livesOfLane(lane ?? "") ?? 0
        expect(lives).toBeLessThanOrEqual(LIVES)
        expect(race.lives("z")).toBe(lives)
        expect(race.lives(leaver)).toBe(0)
        await race.until(() => race.isOver)
        const dump = JSON.stringify({
            alive: race.host.lifeBook?.aliveLanes(), round: race.host.round !== null,
            vacant: race.host.lanes.vacant, arrival: race.host.arrival?.isStarted,
            there: ["a", "b", "c", "d", "z"].map(id => [id, race.laneOf(id), race.host.lanes.holderOf(race.laneOf(id) ?? ""),
                race.host.arrival?.isThere(race.laneOf(id) ?? ""), race.clients.get(id)?.guest.contestant.waitingAt !== null,
                race.clients.get(id)?.run.travel.phase]),
            faults: race.faults.map(fault => fault.describe()),
        })
        expect(race.isOver, dump).toBe(true)
    })

    test("a player that reached the duels while its connection was lost → says where it stands again once back", async() => {
        const race = new Churn(["a", "b", "c"])
        race.room.drop("a")
        // It walks to the duels while nothing it says is heard.
        await race.until(() => race.clients.get("a")?.guest.contestant.waitingAt !== null, 200)
        expect(race.host.arrival?.isThere("lane-1")).toBeFalsy()
        race.room.back("a")
        await settle()
        expect(race.host.arrival?.isThere("lane-1")).toBe(true)
    })

    test("the host stopped while a lane is left → nothing happens after, no timer left", () => {
        const race = new Churn(["a", "b", "c"])
        race.quit("b")
        race.host.dispose()
        const events = race.faults.length
        race.timer.advance(VACANT_MS * 3)
        expect(race.faults.length).toBe(events)
    })
})

describe("a race where everyone comes and goes", () => {
    /** A small deterministic source of choices: what a test draws from, its own. */
    function drawing(seed: number): Rng {
        return new Rng(seed * 9973 + 17)
    }

    /** What may happen to a race at each step. */
    type Event = "quit" | "back" | "newcomer" | "drop" | "return" | "leave" | "wait"
    const EVENTS: readonly Event[] = ["quit", "back", "newcomer", "drop", "return", "leave", "wait", "wait", "wait"]

    function apply(race: Churn, rng: Rng, event: Event, names: { next: number }, dropped: Set<string>): void {
        const ids = [...race.clients.keys()]
        const pick = (): string|null => ids.length === 0 ? null : ids[rng.int(ids.length)]
        const id = pick()
        if(event === "newcomer"){
            race.come(`n${names.next++}`)
            return
        }
        if(id === null) return
        const client = race.clients.get(id)
        if(!client) return
        if(event === "quit" && client.isPlaying && !dropped.has(id)) race.quit(id)
        else if(event === "back" && !client.isPlaying && !dropped.has(id)) race.come(id).isPlaying = true
        else if(event === "drop" && !dropped.has(id) && client.isPlaying){
            race.room.drop(id)
            dropped.add(id)
        } else if(event === "return" && dropped.has(id)){
            race.room.back(id)
            dropped.delete(id)
        } else if(event === "leave" && !dropped.has(id) && ids.length > 2){
            race.leaveRoom(id)
            race.clients.delete(id)
        }
    }

    /** What must hold whatever happened: of the race, of its lanes, and of what each client is told. */
    function check(race: Churn): void {
        const { host } = race
        const book = host.lifeBook
        if(!book) return
        const lanes = ["lane-1", "lane-2", "lane-3", "lane-4", "lane-5", "lane-6"]
        const holders = lanes.map(lane => host.lanes.holderOf(lane)).filter((each): each is string => each !== null)
        // A lane has at most one holder, and a player at most one lane.
        expect(new Set(holders).size).toBe(holders.length)
        for(const lane of lanes){
            const lives = book.livesOfLane(lane)
            expect(lives).toBeGreaterThanOrEqual(0)
            expect(lives).toBeLessThanOrEqual(LIVES)
        }
        // Nobody is refused as late: someone not let in only watches.
        expect(race.faults.filter(fault => fault.describe().includes("started already"))).toEqual([])
        // What the clients are told of the lanes is what the host holds.
        const offer = host.lanes.offer
        for(const [id, client] of race.clients){
            const seen = client.picker.offer
            if(seen === null || client.guest.attendee.participation === null) continue
            expect(seen.candidates).toEqual(offer.candidates)
            expect(seen.held).toEqual(offer.held)
            void id
        }
        // A holder is told it plays, a spectator that it only watches.
        for(const [id, client] of race.clients){
            const role = client.guest.attendee.participation?.role
            if(role === "spectator") expect(race.laneOf(id) === null || !host.lanes.holderOf(race.laneOf(id) ?? "")).toBe(true)
        }
    }

    test("whatever happens, for many draws → the lanes stay sound, the lives only go down, and the race ends", async() => {
        for(let seed = 1; seed <= 40; seed++){
            const rng = drawing(seed)
            const race = new Churn(["a", "b", "c", "d"])
            const names = { next: 1 }
            const dropped = new Set<string>()
            const log: string[] = []
            for(let step = 0; step < 60 && !race.isOver; step++){
                const event = EVENTS[rng.int(EVENTS.length)]
                log.push(`${step}:${event}`)
                apply(race, rng, event, names, dropped)
                await race.step(rng.int(3) * 1_500 + 100)
                check(race)
            }
            // Whatever is lost comes back, then nothing more happens: the race goes on to its end.
            for(const id of [...dropped]) race.room.back(id)
            await race.until(() => race.isOver, 6_000)
            // The lives of each lane only went down.
            for(const history of race.lanesHistory.values()){
                expect(history.every((each, index) => index === 0 || each <= history[index - 1])).toBe(true)
            }
            const state = JSON.stringify({
                alive: race.host.lifeBook?.aliveLanes(), round: race.host.round !== null,
                vacant: race.host.lanes.vacant, arrival: race.host.arrival?.isStarted,
                clients: [...race.clients.values()].map(client => [client.id, race.roleOf(client.id), race.laneOf(client.id),
                    client.isPlaying, client.guest.contestant.waitingAt !== null, client.run.travel.phase,
                    race.host.arrival?.isThere(race.laneOf(client.id) ?? "")]),
                dropped: [...dropped], log: log.join(" "),
                faults: race.faults.map(fault => fault.describe()),
            })
            expect(race.isOver, `seed ${seed} ${state}`).toBe(true)
            expect(race.won.length + race.finished.length).toBe(1)
            // Once it is over, nothing is left running that changes anything.
            race.host.dispose()
            const events = race.faults.length
            race.timer.advance(VACANT_MS * 4)
            expect(race.faults.length).toBe(events)
        }
    }, 300_000)
})

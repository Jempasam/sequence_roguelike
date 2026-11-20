import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { DUEL_HALT, Rng } from "@game/core/mecard"
import type { Battle, Run } from "@game/core/mecard"
import {
    DuelRaceGuest, DuelRaceHost, DuelRacePlayer, duelRules, fixed, InvalidTeamFault, LocalLink, LocalRoom,
    LocalSync, randomTeams, RemoteHub, shrinking,
} from "@game/core/mecard/sync"
import type {
    Contestant, DuelDecision, DuelFighting, DuelWatching, Matched, TeamSize,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import { Player, settle } from "./fixtures"

// --- Fixture builders ---

/** The most steps a test takes to reach the end of what it plays. */
const CAP = 3_000

/** The lives each player starts with. */
const LIVES = 3

/** What plays the hub's duels: it commits what a bot would for its units, then says it is ready. */
class HubActor {


    /** The duel the hub fights or watches now. */
    public access: DuelFighting|DuelWatching|null = null

    /** Does it wait before it submits? */
    public holding = false

    constructor(player: DuelRacePlayer){
        player.fighting.add(access => { this.access = access })
        player.watching.add(access => { this.access = access })
    }


    public act(): void {
        const access = this.access
        if(this.holding || !access) return
        const { battle, units } = access
        if(battle.phase !== "preparation" || units.length === 0) return
        if(this.#acted.get(battle) === battle.round) return
        this.#acted.set(battle, battle.round)
        const mine = new Set(units)
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        access.submit()
    }


    readonly #acted = new WeakMap<Battle, number>()
}

/** A player of the race that plays on the hub itself. */
interface Local {
    readonly id: string
    readonly run: Run
    readonly link: LocalLink
    readonly player: DuelRacePlayer
    readonly actor: HubActor
}

interface Race {
    readonly room: LocalRoom
    readonly channel: LocalSync
    readonly timer: ManualScheduler
    readonly host: DuelRaceHost
    readonly locals: Local[]
    readonly guests: Map<string, DuelRaceGuest>
    readonly players: Map<string, Player>
    readonly runs: Map<string, Run>

    /** The players that never walk to the duels. */
    readonly idle: Set<string>
    readonly history: Map<string, number[]>
    readonly won: string[]
    readonly matched: Matched[]
    readonly decided: DuelDecision[]
    readonly faults: Fault[]
    finished(): number
}

interface Options {
    readonly lives?: number
    readonly teamSize?: TeamSize
    readonly idle?: readonly string[]
}

/** A hub that plays with the ids it is given, and clients far away with the others. */
function racing(localIds: readonly string[], remoteIds: readonly string[], options: Options = {}): Race {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const timer = new ManualScheduler()
    const teamSize = options.teamSize ?? fixed(1)
    const lives = options.lives ?? LIVES
    const rules = duelRules(new Rng(5), {
        lives, duelEvery: 2, arrivalMs: 1_000, teamSize, matching: randomTeams(new Rng(6), teamSize),
    })
    const host = new DuelRaceHost(rules, room, channel, timer, new Rng(7))
    const ids = [...localIds, ...remoteIds]
    const history = new Map<string, number[]>(ids.map(id => [id, [lives]]))
    const won: string[] = []
    const matched: Matched[] = []
    const decided: DuelDecision[] = []
    const faults: Fault[] = []
    let finished = 0
    host.won.add(id => won.push(id))
    host.finished.add(() => finished++)
    host.faulted.add(fault => faults.push(fault))
    host.roundStarted.add(() => {
        host.round?.matched.add(each => matched.push(each))
        host.round?.decided.add(each => decided.push(each))
    })
    const runs = new Map<string, Run>()
    const locals: Local[] = []
    ids.forEach((id, index) => {
        if(!localIds.includes(id)) return
        const run = startedRun(index + 1)
        const link = host.addLocal(id)
        if(!(link instanceof LocalLink)) throw new Error(`The hub could not play as ${id}.`)
        const player = new DuelRacePlayer(rules, link, run, id)
        runs.set(id, run)
        locals.push({ id, run, link, player, actor: new HubActor(player) })
    })
    const guests = new Map<string, DuelRaceGuest>()
    const players = new Map<string, Player>()
    ids.forEach((id, index) => {
        if(localIds.includes(id)) return
        const run = startedRun(index + 1)
        const guest = new DuelRaceGuest(rules, room.join(id), channel, timer, run, id)
        runs.set(id, run)
        guests.set(id, guest)
        players.set(id, new Player(id, guest.view, () => guest.ready()))
    })
    host.start()
    host.lifeBook?.lifeLost.add(({ id, left }) => history.get(id)?.push(left))
    return {
        room, channel, timer, host, locals, guests, players, runs, idle: new Set(options.idle ?? []), history,
        won, matched, decided, faults, finished: () => finished,
    }
}

/** A player reaches the next halt of the duels of its map, unless it dawdles, or already waits at one. */
function walk(race: Race, id: string, contestant: Contestant): void {
    const run = race.runs.get(id)
    if(!run || race.idle.has(id) || contestant.waitingAt) return
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

function isOver(race: Race): boolean {
    return race.won.length + race.finished() > 0
}

/** Play until a condition holds, or a cap is reached: the players walk, the players plan, the time moves. */
async function playOut(race: Race, until: (race: Race) => boolean = isOver): Promise<void> {
    for(let step = 0; step < CAP && !until(race); step++){
        for(const local of race.locals) walk(race, local.id, local.player.contestant)
        for(const [id, guest] of race.guests) walk(race, id, guest.contestant)
        await settle()
        for(const local of race.locals) local.actor.act()
        for(const player of race.players.values()) player.act()
        race.timer.advance(100)
        await settle()
    }
}

/** The number of the duel the hub fights, none when it fights none. */
function numberOfHubDuel(race: Race): number|null {
    return race.host.round?.fights.find(fight => fight.sides.flat().includes("hub"))?.number ?? null
}

// --- Tests ---

describe("a hub that plays", () => {
    test("a race with a hub and a client → the hub is a member that loses lives, and it ends", async() => {
        const race = racing(["hub"], ["b"], { lives: 2 })
        const [{ player }] = race.locals
        const eliminated: string[] = []
        const told: string[] = []
        player.eliminated.add(() => eliminated.push("hub"))
        player.won.add(winner => told.push(winner))
        player.finished.add(() => told.push("none"))
        await playOut(race)
        expect(isOver(race)).toBe(true)
        expect(race.won.length + race.finished()).toBe(1)
        expect(race.host.gathering.members.map(member => member.id)).toEqual(["hub", "b"])
        for(const [, lives] of race.history){
            expect(lives.every((each, index) => index === 0 || each === lives[index - 1] - 1)).toBe(true)
        }
        // The hub is told of the end of the race, and of its own elimination, as any player is.
        expect(told).toEqual([race.won[0] ?? "none"])
        expect(eliminated.length).toBe(race.history.get("hub")?.at(-1) === 0 ? 1 : 0)
    })

    test("the hub's duel → the very battle of the round, with no copy made for it", async() => {
        const race = racing(["hub"], ["b"])
        const [{ actor, player }] = race.locals
        actor.holding = true
        await playOut(race, () => actor.access !== null)
        const number = numberOfHubDuel(race)
        expect(number).not.toBeNull()
        expect(player.hub).toBeInstanceOf(LocalLink)
        expect(player.hub).not.toBeInstanceOf(RemoteHub)
        expect(actor.access?.battle).toBe(race.host.round?.battleOf(number ?? -1))
        // The client far away has a copy of its own.
        expect(race.guests.get("b")?.view.battle).not.toBe(actor.access?.battle)
    })

    test("a duel the hub fights → no round passes before it submits", async() => {
        const race = racing(["hub"], ["b"])
        const [{ actor }] = race.locals
        actor.holding = true
        await playOut(race, () => actor.access !== null)
        const battle = actor.access?.battle
        if(!battle) throw new Error("The hub fights no duel.")
        // The client far away plays, and is ready: only the hub is waited for.
        await playOut(race, () => race.players.get("b")?.view.battle?.phase === "preparation")
        const round = battle.round
        let waited = 0
        await playOut(race, () => waited++ >= 50)
        expect(battle.phase).toBe("preparation")
        expect(battle.round).toBe(round)
        actor.holding = false
        await playOut(race, () => battle.round > round || battle.phase !== "preparation")
        expect(battle.round > round || battle.phase !== "preparation").toBe(true)
    })

    test("a duel without the hub → goes on by itself while the hub holds its own", async() => {
        const race = racing(["hub"], ["b", "c", "d"])
        const [{ actor }] = race.locals
        actor.holding = true
        await playOut(race, each => each.decided.some(({ fight }) => !fight.sides.flat().includes("hub")))
        expect(race.decided.some(({ fight }) => !fight.sides.flat().includes("hub"))).toBe(true)
        expect(race.decided.every(({ fight }) => !fight.sides.flat().includes("hub"))).toBe(true)
        expect(actor.access?.battle.phase).toBe("preparation")
    })

    test("a hub that is late → sent to the duels where it stands, and it loses one life", async() => {
        const race = racing(["hub"], ["b"], { idle: ["hub"] })
        const [{ run, player }] = race.locals
        await playOut(race, each => each.history.get("hub")?.length === 2)
        expect(race.history.get("hub")?.slice(0, 2)).toEqual([LIVES, LIVES - 1])
        expect(race.history.get("b")?.length).toBe(1)
        expect(run.travel.halt?.type).toBe(DUEL_HALT)
        expect(player.contestant.waitingAt).not.toBeNull()
    })

    test("the clients far away → see where the hub stands, and the hub sees them", async() => {
        const race = racing(["hub"], ["b"])
        const [{ player, run }] = race.locals
        await playOut(race, each => each.guests.get("b")?.progress.progressOf("hub")?.atDuel === true)
        expect(race.guests.get("b")?.progress.progressOf("hub")?.atDuel).toBe(true)
        expect(run.travel.halt?.type).toBe(DUEL_HALT)
        expect(player.others.progressOf("b")).not.toBeNull()
        expect(player.lives.livesOf("b")).toBe(LIVES)
        expect(player.lives.alive()).toContain("hub")
    })

    test("a team that cannot be loaded → the hub is left out of its duel and loses a life, as any player", async() => {
        const race = racing(["hub"], ["b"])
        const [{ link }] = race.locals
        link.answerTeam(() => [])
        await playOut(race, each => each.history.get("hub")?.length === 2)
        expect(race.history.get("hub")?.slice(0, 2)).toEqual([LIVES, LIVES - 1])
        expect(race.faults.some(fault => fault instanceof InvalidTeamFault)).toBe(true)
    })

    test("two hubs and a client → every one of them in the lobby, and ready as the others say it", () => {
        const race = racing(["h1", "h2"], ["b"])
        expect(race.host.gathering.members.map(member => member.id)).toEqual(["h1", "h2", "b"])
        const [first] = race.locals
        first.link.setReady(true)
        expect(race.host.gathering.isReady("h1")).toBe(true)
        first.link.setReady(false)
        expect(race.host.gathering.isReady("h1")).toBe(false)
    })
})

describe("a race with no client", () => {
    test("three players on the hub → a race to its end, the lives only falling, at most one winner", async() => {
        const race = racing(["a", "b", "c"], [], { teamSize: shrinking(2), lives: 1 })
        await playOut(race)
        expect(isOver(race)).toBe(true)
        expect(race.won.length).toBeLessThanOrEqual(1)
        for(const [, lives] of race.history){
            expect(lives.every((each, index) => index === 0 || each === lives[index - 1] - 1)).toBe(true)
            expect(Math.min(...lives)).toBeGreaterThanOrEqual(0)
        }
    })

    test("a spectator → loses nothing, and watches a duel", async() => {
        const race = racing(["a", "b", "c"], [], { teamSize: shrinking(2) })
        await playOut(race, each => each.matched.length > 0 && each.decided.length > 0)
        const [first] = race.matched
        expect(first.watchers.size).toBe(1)
        const [watcher] = [...first.watchers.keys()]
        expect(race.history.get(watcher)).toEqual([LIVES])
        const local = race.locals.find(each => each.id === watcher)
        expect(local?.actor.access?.units).toEqual([])
        expect(local?.actor.access?.battle).not.toBeUndefined()
    })
})

import { ManualScheduler } from "@game/core"
import { DUEL_HALT, Rng } from "@game/core/mecard"
import type { Battle, Run } from "@game/core/mecard"
import {
    DuelRaceGuest, DuelRaceHost, DuelRacePlayer, duelRules, fixed, LocalLink, LocalRoom, LocalSync,
    MergedRoom, MergedSender, randomTeams,
} from "@game/core/mecard/sync"
import type { Contestant, DuelFighting } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import { Player, settle } from "./fixtures"

// --- Fixture builders ---

/** The most steps a test takes to reach the end of what it plays. */
const CAP = 3_000

/** What a battle is, at a moment, as text: its save, as the broadcaster of a duel writes it. */
type Snapshots = Map<string, string>

/** Write down a battle each time it starts a preparation and when it is over. */
function snapshot(store: Snapshots, index: number, battle: Battle): void {
    battle.phaseChanged.add(phase => {
        if(phase === "preparation" || phase === "over") {
            store.set(`${index}:${battle.round}:${phase}`, JSON.stringify(battle.save()))
        }
    })
}

/** A hub that plays, and a client that reaches it by a link within the program, its duels copied. */
function looped() {
    const network = new LocalRoom()
    const loop = new LocalRoom()
    const networkChannel = new LocalSync()
    const loopChannel = new LocalSync()
    const timer = new ManualScheduler()
    const rules = duelRules(new Rng(5), {
        lives: 2,
        duelEvery: 2,
        arrivalMs: 1_000,
        teamSize: fixed(1),
        matching: randomTeams(new Rng(6), fixed(1)),
    })
    const room = new MergedRoom([network, loop])
    const sender = new MergedSender([networkChannel, loopChannel])
    const host = new DuelRaceHost(rules, room, sender, timer, new Rng(7))
    const link = host.addLocal("hub")
    if(!(link instanceof LocalLink)) throw new Error("The hub could not play.")
    const hubRun = startedRun(1)
    const hub = new DuelRacePlayer(rules, link, hubRun, "hub")
    const loopRun = startedRun(2)
    const guest = new DuelRaceGuest(rules, loop.join("loop"), loopChannel, timer, loopRun, "loop")
    const player = new Player("loop", guest.view, () => guest.ready())
    const original: Snapshots = new Map()
    const mirror: Snapshots = new Map()
    let access: DuelFighting|null = null
    let fought = 0
    let mirrored = 0
    hub.fighting.add(each => {
        access = each
        snapshot(original, fought++, each.battle)
    })
    guest.hub.fighting.add(each => snapshot(mirror, mirrored++, each.battle))
    const acted = new WeakMap<Battle, number>()
    const actHub = (): void => {
        if(!access) return
        const { battle, units } = access
        if(battle.phase !== "preparation" || acted.get(battle) === battle.round) return
        acted.set(battle, battle.round)
        const mine = new Set(units)
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        access.submit()
    }
    let finished = 0
    let won = 0
    host.finished.add(() => finished++)
    host.won.add(() => won++)
    host.start()
    return {
        host, hubRun, loopRun, hub, guest, player, original, mirror, actHub, timer,
        isOver: () => finished + won > 0,
        fights: () => fought,
        mirrored: () => mirrored,
    }
}

/** A player reaches the next halt of the duels of its map, or already waits at one. */
function walk(run: Run, contestant: Contestant): void {
    if(contestant.waitingAt) return
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

// --- Tests ---

describe("a hub that plays, and a client reached by a loop within the program", () => {
    test("the duels fought → the copy equals the hub's battle at each preparation and at the end", async() => {
        const world = looped()
        for(let step = 0; step < CAP && !world.isOver(); step++){
            walk(world.hubRun, world.hub.contestant)
            walk(world.loopRun, world.guest.contestant)
            await settle()
            world.actHub()
            world.player.act()
            world.timer.advance(100)
            await settle()
        }
        expect(world.isOver()).toBe(true)
        // Each duel the hub fights is copied for the client of the loop, and only for it.
        expect(world.fights()).toBeGreaterThan(0)
        expect(world.mirrored()).toBe(world.fights())
        const shared = [...world.original.keys()].filter(key => world.mirror.has(key))
        expect(shared.some(key => key.endsWith(":over"))).toBe(true)
        expect(shared.some(key => key.endsWith(":preparation"))).toBe(true)
        for(const key of shared) expect(world.mirror.get(key), key).toBe(world.original.get(key))
    })

    test("the copy → made for the client of the loop, never for the hub", async() => {
        const world = looped()
        for(let step = 0; step < CAP && world.fights() === 0; step++){
            walk(world.hubRun, world.hub.contestant)
            walk(world.loopRun, world.guest.contestant)
            await settle()
            world.timer.advance(100)
            await settle()
        }
        expect(world.fights()).toBeGreaterThan(0)
        const original = world.host.round?.battleOf(world.host.round.fights[0].number)
        expect(original).not.toBeNull()
        expect(world.guest.view.battle).not.toBeNull()
        expect(world.guest.view.battle).not.toBe(original)
    })
})

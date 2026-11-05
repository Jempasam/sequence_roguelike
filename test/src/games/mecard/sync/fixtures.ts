import { Run } from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"
import {
    COOP_SEATS, FIXED_SEATS, LocalRoom, LocalSync, RunBroadcaster, RunGuest, RunHost, RunReceiver,
} from "@game/core/mecard/sync"
import type { SeatMode, SeatPolicy, SyncLink } from "@game/core/mecard/sync"

/** A run hosted, told on a channel, with how many times everyone was ready. */
export interface Hosted {
    readonly run: Run
    readonly room: LocalRoom
    readonly channel: LocalSync
    readonly host: RunHost

    /** How many rounds everyone was ready for. */
    told(): number
}

/** A client playing a run hosted. */
export interface Playing {
    readonly viewer: Run
    readonly receiver: RunReceiver
    readonly link: SyncLink
    readonly guest: RunGuest

    /** What it was told it plays, in order. */
    readonly seats: (readonly string[])[]
}

/** A run hosted, nobody connected. */
export function hosted(mode: SeatMode = COOP_SEATS, policy: SeatPolicy = FIXED_SEATS): Hosted {
    const run = new Run(11)
    const room = new LocalRoom()
    const channel = new LocalSync()
    let told = 0
    const host = new RunHost(run, room, mode, policy, () => told++)
    new RunBroadcaster(run, channel)
    return { run, room, channel, host, told: () => told }
}

/** A client coming to play. */
export function connected({ room, channel }: Hosted, id: string): Playing {
    const viewer = new Run(0)
    const receiver = new RunReceiver(viewer, channel)
    const link = room.join(id)
    const seats: (readonly string[])[] = []
    const guest = new RunGuest(viewer, link, units => seats.push(units))
    return { viewer, receiver, link, guest, seats }
}

/** Reach a fight of the run, its battle started and no round drawn. */
export function fight(run: Run): Battle {
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
    if(!run.battle) throw new Error("No battle started.")
    return run.battle
}

/** The unit of a name in a battle. */
export function unitOf(battle: Battle|null, name: string): Unit {
    const unit = battle?.units.find(each => each.name === name)
    if(!unit) throw new Error(`No ${name} in the battle.`)
    return unit
}

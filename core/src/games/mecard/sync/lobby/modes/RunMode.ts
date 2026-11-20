import { Rng } from "../../../sim/base/Rng"
import type { Run } from "../../../sim/run/Run"
import { signal } from "../../faults"
import { RunBroadcaster } from "../../run/RunBroadcaster"
import { RunGuest } from "../../run/RunGuest"
import { RunHost } from "../../run/RunHost"
import { RunReceiver } from "../../run/RunReceiver"
import { COOP_SEATS, ENEMY_SEATS, FIXED_SEATS, randomSeats } from "../../run/Seats"
import type { Seatable, SeatMode } from "../../run/Seats"
import type { LobbyMode, LobbyRole, ModeRun } from "../LobbyMode"
import { ChoiceSetting } from "../Setting"
import type { SettingValues } from "../Setting"
import type { GuestStage, HostStage } from "../Stage"
import type { Fault } from "../../../../../engine/net/Fault"

/** A run the main client plays on its screen, for the clients to play with. */
export interface HostedRun {
    /** The run, new, which the screen shows. */
    readonly run: Run

    /** Start the round of the battle on screen: the host and every client it waits for are ready. */
    startRound(): void

    /** Lock the units the clients play, until they are ready: the host does not plan them. */
    lockGuests(isGuests: (unit: Seatable) => boolean): void

    /** Told when the player says they are ready, set by the mode. */
    onReady: (() => void)|null

    /** Told when the run is over for good, as the party fell: set by the mode. */
    onOver: (() => void)|null

    /** Take the run off the screen. */
    close(): void
}

/** A run played on another client, which a client sees on its screen, and plays the units it is given of. */
export interface JoinedRun {
    /** The run, empty until the main client tells it. */
    readonly run: Run

    /** What the client plays, each time it changes: the rest stays locked. None means it only watches. */
    seat(units: readonly string[]): void

    /** Told when the player says they are ready, set by the mode. */
    onReady: (() => void)|null

    /** Take the run off the screen. */
    close(): void
}

/** What the modes of a run ask of the screen, which they know nothing of. */
export interface RunBench {
    /** Show a new run the main client plays. */
    host(): HostedRun

    /** Show the run another client plays. */
    join(): JoinedRun

    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void
}

/** The ways the places of a run are given to the clients. */
const PLACES = ["fixées", "aléatoires"] as const

/**
 * A run several clients play together: the main client plays it on its screen and gives each client that
 * comes to play some of its units, and a client that comes late watches.
 *
 * @remarks
 * What differs among its kinds is what the clients are given to play: the heroes of the party, or the foes.
 */
export class RunMode implements LobbyMode {


    public readonly settings = [new ChoiceSetting("places", "Places", PLACES)]

    constructor(
        public readonly id: string,
        public readonly title: string,

        /** What the clients are given to play. */
        private readonly seats: SeatMode,

        private readonly bench: RunBench,
    ){}


    public host(stage: HostStage, values: SettingValues): ModeRun {
        const hosted = this.bench.host()
        const policy = values.places === "aléatoires" ? randomSeats(new Rng(Date.now())) : FIXED_SEATS
        // Made first: a battle told to the clients has its units given already.
        const host = new RunHost(hosted.run, stage.room, this.seats, policy, () => hosted.startRound(), {
            game: stage.game,
            greet: peer => stage.sender.greet(peer),
        })
        host.faulted.add(fault => this.bench.report(fault.describe()))
        hosted.lockGuests(unit => host.isGuests(unit))
        hosted.onReady = () => host.ready()
        const broadcaster = new RunBroadcaster(hosted.run, stage.sender)
        const ended = signal<Fault|null>()
        hosted.onOver = () => ended.notify(null)
        return {
            ended,
            dispose: () => {
                hosted.onOver = null
                hosted.onReady = null
                broadcaster.dispose()
                host.dispose()
                hosted.close()
            },
        }
    }

    public guest(stage: GuestStage, _values: SettingValues, role: LobbyRole): ModeRun {
        const joined = this.bench.join()
        const receiver = new RunReceiver(joined.run, stage.source)
        receiver.faulted.add(fault => this.bench.report(fault.describe()))
        receiver.battle.onDesync = ({ round }) => this.bench.report(`Désynchronisé au round ${round} : rattrapé.`)
        receiver.travel.onDesync = () => this.bench.report("Désynchronisé sur la carte : rattrapé.")
        let guest: RunGuest|null = null
        if(role === "player" && stage.link){
            guest = new RunGuest(joined.run, stage.link, units => joined.seat(units), stage.game)
            guest.faulted.add(fault => this.bench.report(fault.describe()))
            const playing = guest
            joined.onReady = () => playing.ready()
        }
        return {
            ended: signal<Fault|null>(),
            quit: guest ? () => guest?.quit() : undefined,
            dispose: () => {
                joined.onReady = null
                guest?.dispose()
                receiver.dispose()
                joined.close()
            },
        }
    }
}

/** The clients play the heroes of the party by the side of the host. */
export function runCoopMode(bench: RunBench): LobbyMode {
    return new RunMode("run-coop", "Run coop", COOP_SEATS, bench)
}

/** The clients play the enemies the host's party fights. */
export function runEnemyMode(bench: RunBench): LobbyMode {
    return new RunMode("run-ennemi", "Run ennemi", ENEMY_SEATS, bench)
}

import type { TimerPort } from "../../../../../platform"
import { Fault } from "../../../../../engine/net/Fault"
import { Rng } from "../../../sim/base/Rng"
import type { FloorType } from "../../../sim/floor/Floor"
import { upgradeFloorType } from "../../../sim/floor/subs/UpgradeFloor"
import type { Run } from "../../../sim/run/Run"
import { signal } from "../../faults"
import { DuelRaceGuest } from "../../modes/duelRace/DuelRaceGuest"
import { DuelRaceHost } from "../../modes/duelRace/DuelRaceHost"
import { duelRules } from "../../modes/duelRace/DuelRules"
import type { DuelRules } from "../../modes/duelRace/DuelRules"
import { shrinking } from "../../modes/Matching"
import { DuelRacePlayer } from "../../modes/players/DuelRacePlayer"
import { LocalLink } from "../../modes/players/LocalLink"
import type { LobbyMode, LobbyRole, ModeRun } from "../LobbyMode"
import { HOST_ID } from "../Profile"
import { RangeSetting } from "../Setting"
import type { Setting, SettingValues } from "../Setting"
import type { GuestStage, HostStage } from "../Stage"

/** A run played on the screen of a player of a race, by itself: nobody plays it for it. */
export interface RaceScreen {
    /** The run of the player, new, which the screen shows. */
    readonly run: Run

    /**
     * Show the race of a player on the run: its duels fought or watched, the lives of the players, the time
     * left, and who stands where. Does nothing of what the player does: it only shows, and says it is ready.
     */
    follow(player: DuelRacePlayer): void

    /** Take the run off the screen. */
    close(): void
}

/** What the modes of a race ask of the screen, which they know nothing of. */
export interface RaceBench {
    /** Where time goes: the deadlines of the race. */
    readonly timer: TimerPort

    /**
     * Show a new run for a player of a race.
     *
     * @param firstFloor - The floor it starts on, the usual one for none.
     */
    race(firstFloor: FloorType|null): RaceScreen

    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void
}

/** The race started with the lobby, and this client came when it was on already. */
export class RaceStartedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "La course a déjà commencé : elle ne se rejoint pas en cours."
    }
}

/** The main client did not tell this client who it is yet, so the race cannot know it. */
export class UnknownPlayerFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "Le lobby n'a pas encore dit qui tu es : impossible de rejoindre la course."
    }
}

/** The main client turned itself away from its own race. */
export class HubRefusedFault extends Fault {


    constructor(public readonly reason: Fault){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `L'hôte n'a pas pu jouer sa propre course : ${this.reason.describe()}`
    }
}

/** How long the hub waits for the clients of the lobby, before it starts with those that joined, in ms. */
export const JOIN_WAIT_MS = 10_000

/** What a race of duels takes from its settings. */
interface Course {
    /** The rules of the race, the same on every client. */
    rules(values: SettingValues, rng: Rng): DuelRules

    /** The floor the players start on, none for the usual one. */
    floor(values: SettingValues): FloorType|null
}

/**
 * A race of duels played from a lobby: each player plays a run of its own, and the hub makes the players
 * that arrived at the duels into camps, has the duels fought, and takes lives from the losers, until one
 * is left.
 *
 * @remarks
 * What differs among its kinds is the course: where the players start, and where the duels lie. A client that
 * comes after the race started is turned away with the reason, for it has no run to play it on.
 */
export class DuelRaceMode implements LobbyMode {


    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly settings: readonly Setting[],
        private readonly course: Course,
        private readonly bench: RaceBench,
    ){}


    public host(stage: HostStage, values: SettingValues): ModeRun|Fault {
        const rules = this.course.rules(values, new Rng(Date.now()))
        const screen = this.bench.race(this.course.floor(values))
        const { timer } = this.bench
        const race = new DuelRaceHost(rules, stage.room, stage.sender, timer, new Rng(Date.now() + 1))
        const link = race.addLocal(HOST_ID)
        if(!(link instanceof LocalLink)){
            race.dispose()
            screen.close()
            return new HubRefusedFault(link)
        }
        const player = new DuelRacePlayer(rules, link, screen.run, HOST_ID)
        screen.follow(player)
        race.faulted.add(fault => this.bench.report(fault.describe()))
        const ended = signal<Fault|null>()
        race.ended.add(fault => ended.notify(fault))
        // Starts once everyone of the lobby joined, or with those that did after a while.
        const expected = 1 + stage.reachable.length
        const waiting = timer.after(JOIN_WAIT_MS, () => race.start())
        const joined = race.gathering.memberJoined.add(() => {
            if(race.gathering.members.length >= expected) race.start()
        })
        return {
            ended,
            dispose: () => {
                waiting.cancel()
                joined.remove()
                player.dispose()
                race.dispose()
                screen.close()
            },
        }
    }

    public guest(stage: GuestStage, values: SettingValues, role: LobbyRole): ModeRun|Fault {
        if(role === "spectator") return new RaceStartedFault()
        if(!stage.link || stage.id === null) return new UnknownPlayerFault()
        const rules = this.course.rules(values, new Rng(0))
        const screen = this.bench.race(this.course.floor(values))
        const { timer } = this.bench
        const guest = new DuelRaceGuest(rules, stage.link, stage.source, timer, screen.run, stage.id)
        screen.follow(guest.player)
        guest.faulted.add(fault => this.bench.report(fault.describe()))
        const ended = signal<Fault|null>()
        guest.ended.add(fault => ended.notify(fault))
        return {
            ended,
            dispose: () => {
                guest.dispose()
                screen.close()
            },
        }
    }
}

/** How many players a camp holds at most, and the floors of the race: the settings of both races. */
const TEAM = new RangeSetting("equipe", "Équipe", 1, 4, 1, 2)

/** The race of duels on the usual floors, a row of the duels every so many rows. */
export function duelRaceMode(bench: RaceBench): LobbyMode {
    const settings = [
        new RangeSetting("vies", "Vies", 1, 10, 1, 6),
        new RangeSetting("arrivee", "Arrivée (s)", 30, 300, 30, 90),
        TEAM,
        new RangeSetting("frequence", "Duel tous les (rangs)", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: Number(values.vies),
            arrivalMs: Number(values.arrivee) * 1000,
            teamSize: shrinking(Number(values.equipe)),
            duelEvery: Number(values.frequence),
        }),
        floor: () => null,
    }
    return new DuelRaceMode("course-duels", "Course de duels", settings, course, bench)
}

/** The versus: the players upgrade on a map of their own, then meet in one row of duels. */
export function versusMode(bench: RaceBench): LobbyMode {
    const settings = [
        new RangeSetting("equipe", "Équipe", 1, 4, 1, 1),
        new RangeSetting("hauteur", "Hauteur de la carte", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: 1,
            teamSize: shrinking(Number(values.equipe)),
            // No row of the duels in the middle of the map: the one at its end.
            duelEvery: 1_000,
            closing: true,
        }),
        floor: values => upgradeFloorType(Number(values.hauteur)),
    }
    return new DuelRaceMode("versus", "Versus", settings, course, bench)
}

import type { Fault } from "../../../../engine/net/Fault"
import type { Observable } from "../../sim/base/Observable"

import type { Setting, SettingValues } from "../../sim/mode/Setting"
import type { GuestStage, HostStage } from "./Stage"

/** How a client takes part in a game: it plays, or it only watches, as one that came late does. */
export type LobbyRole = "player"|"spectator"

/** A game being played from a lobby, as the lobby sees it. */
export interface ModeRun {
    /** Told once when the game is over, with why when it ended badly. */
    readonly ended: Observable<Fault|null>

    /** Stop the game, whatever state it is in. The stage is the lobby's to drop. */
    dispose(): void

    /**
     * Leave the game while it goes on for the others, and stay in the room: a client says so to the main client,
     * which keeps what it needs, or not. A game that cannot be left this way has none.
     */
    quit?(): void
}

/**
 * A kind of game a lobby offers: what its players can set, and how it is played on the stage of the lobby.
 *
 * @remarks
 * Whatever a game tells its clients when it starts goes through {@link SyncSender.onPeer}: the lobby tells
 * the clients the game starts, then has the stage greet them, and a message sent before is lost to them.
 */
export interface LobbyMode {
    /** What tells it from the other modes, as the clients are told which was chosen. */
    readonly id: string

    /** What it is called to the players. */
    readonly title: string

    /** What it does, in a sentence or two, as the lobby shows it. */
    readonly description: string

    readonly settings: readonly Setting[]

    /**
     * What each participant sets for itself, by choices: told to the manager when it joins. None by default.
     */
    readonly participantSettings?: readonly Setting[]

    /**
     * Play it from the main client, or say why it cannot be. The values fit the settings; `mine` is what the
     * host sets for itself, and fits the participant settings.
     */
    host(stage: HostStage, values: SettingValues, mine?: SettingValues): ModeRun|Fault

    /** Play it from a client, or say why it cannot be. `mine` is what this client sets for itself. */
    guest(stage: GuestStage, values: SettingValues, role: LobbyRole, mine?: SettingValues): ModeRun|Fault
}

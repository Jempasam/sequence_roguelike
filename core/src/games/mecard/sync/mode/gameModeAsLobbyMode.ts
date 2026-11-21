import { Fault } from "../../../../engine/net/Fault"
import type { TimerPort } from "../../../../platform"
import { Rng } from "../../sim/base/Rng"
import type { LobbyMode, LobbyRole, ModeRun } from "../lobby/LobbyMode"
import { HOST_ID } from "../lobby/Profile"
import type { SettingValues } from "../../sim/mode/Setting"
import type { GuestStage, HostStage } from "../lobby/Stage"
import type { GameBench } from "../../sim/mode/GameBench"

import type { GameMode } from "../../sim/mode/GameMode"
import { GameModeGuest, remoteGuest } from "./GameModeGuest"
import { GameModeHost, LocalSeat } from "./GameModeHost"

/** The main client did not tell this client who it is yet, nor give it a link to speak on. */
export class NoLinkFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "Le lobby n'a pas encore dit qui tu es : impossible de rejoindre la partie."
    }
}

/**
 * A mode of game as the lobby plays it: the manager on the main client with the player that shares it, a
 * player on each
 * other. The lobby knows nothing of what a game says over the network.
 */
export function gameModeAsLobbyMode(def: GameMode, bench: GameBench, timer: TimerPort): LobbyMode {
    return {
        id: def.id,
        title: def.title,
        description: def.description,
        settings: def.settings,
        participantSettings: def.participantSettings,

        host(stage: HostStage, values: SettingValues, mine?: SettingValues): ModeRun {
            const report = (text: string): void => bench.report(text)
            const host = new GameModeHost(stage, def.manager(values), {
                timer,
                rng: new Rng(Date.now()),
                title: def.title,
                report,
                participantSettings: def.participantSettings,
            })
            // The manager's client plays too, with a mode of its own: nothing is shared with the manager's.
            const seat = new LocalSeat(HOST_ID)
            const options = { timer: null, report }
            const guest = new GameModeGuest(def, values, seat, options, null, HOST_ID, stage.game)
            host.faulted.add(fault => report(fault.describe()))
            guest.faulted.add(fault => report(fault.describe()))
            host.attachLocal(guest, seat, mine)
            host.start()
            return {
                ended: host.ended,
                dispose: () => {
                    host.dispose()
                    guest.dispose()
                },
            }
        },

        guest(stage: GuestStage, values: SettingValues, _role: LobbyRole, mine?: SettingValues): ModeRun|Fault {
            if(!stage.link || stage.id === null) return new NoLinkFault()
            const report = (text: string): void => bench.report(text)
            const options = { timer, report }
            const guest = remoteGuest(def, values, stage.link, stage.id, stage.game, options)
            guest.faulted.add(fault => report(fault.describe()))
            // Says it joins last, once everything the manager tells is listened to.
            guest.join(mine)
            return {
                ended: guest.ended,
                quit: () => guest.quit(),
                dispose: () => guest.dispose(),
            }
        },
    }
}

import { BATTLE_SAVE_VERSION } from "../../sim/save/battleSave"
import type { BattleSave } from "../../sim/save/battleSave"
import { RUN_SAVE_VERSION } from "../../sim/save/runSave"
import type { RunSave } from "../../sim/save/runSave"

/** Where a message stands among those of the main client. */
interface RunStamp {
    /** Which run it is, from 1, so a viewer tells a new run from what goes on. */
    readonly number: number

    /** Which message of the run it is, from 1, so a late one is told from a new one. */
    readonly sequence: number
}

/** The run as it stands on the map, when it is told and when a halt or a fight is left. */
export interface RunRest extends RunStamp {
    readonly kind: "save"
    readonly save: RunSave
}

/** A battle starts: its rounds then come on their own. */
export interface RunBattle extends RunStamp {
    readonly kind: "battle"
    readonly save: BattleSave
}

/** What the main client tells its viewers of the run. */
export type RunMessage = RunRest|RunBattle

/** A message as sent. */
export function writeRunMessage(message: RunMessage): string {
    return JSON.stringify(message)
}

/**
 * A message as received.
 *
 * @throws {@link Error} When it is no message of a run, or of another version of the save.
 */
export function readRunMessage(text: string): RunMessage {
    const message = JSON.parse(text) as Partial<RunRest>&Partial<Omit<RunBattle, "save">>|null
    const isMessage = typeof message === "object" && message !== null
        && (message.kind === "save" || message.kind === "battle")
        && typeof message.number === "number" && typeof message.sequence === "number"
        && typeof message.save === "object" && message.save !== null
    if(!isMessage) throw new Error("A message of the run came in another shape: is the other client up to date?")
    const version = message.kind === "save" ? RUN_SAVE_VERSION : BATTLE_SAVE_VERSION
    if(message.save.version !== version){
        throw new Error(`The other client saves in version ${message.save.version}, this one in ${version}.`)
    }
    return message as RunMessage
}

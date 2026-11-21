import { LOBBY_MODE_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

import type { SettingValues } from "../../sim/mode/Setting"

/** Where the lobby stands: the mode it is set on, how it is set, and whether it is being played. */
export interface ModeState {
    /** The id of the mode. */
    readonly mode: string

    readonly values: SettingValues

    /** Is the game being played? Nothing is changed in the meantime. */
    readonly playing: boolean

    /** The number of the game being played, or of the last one: what its messages are told apart by. */
    readonly game: number
}

export function writeModeState(state: ModeState): string {
    return JSON.stringify(state)
}

export function readModeState(text: string): ModeState|UnreadableFault {
    const read = readJson(LOBBY_MODE_TOPIC.name, text)
    if(read instanceof UnreadableFault) return read
    if(typeof read !== "object" || read === null || Array.isArray(read)) return wrongShape(LOBBY_MODE_TOPIC.name, text, "mode")
    const { mode, values, playing, game } = read as Record<string, unknown>
    if(typeof mode !== "string" || typeof playing !== "boolean" || typeof game !== "number"){
        return wrongShape(LOBBY_MODE_TOPIC.name, text, "mode")
    }
    if(typeof values !== "object" || values === null || Array.isArray(values)) return wrongShape(LOBBY_MODE_TOPIC.name, text, "mode")
    const entries = Object.entries(values)
    if(!entries.every(([, value]) => typeof value === "string" || typeof value === "number")){
        return wrongShape(LOBBY_MODE_TOPIC.name, text, "mode")
    }
    return { mode, values: Object.fromEntries(entries) as SettingValues, playing, game }
}

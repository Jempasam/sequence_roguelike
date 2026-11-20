import { BATTLE_SAVE_VERSION } from "../../sim/save/battleSave"
import type { BattleSave } from "../../sim/save/battleSave"

import { BATTLE_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape, wrongVersion } from "../read"

/**
 * When a message is sent: at the start of a preparation, the round drawn, so a viewer catches up with
 * whatever its own simulation missed; or at its end, every chain committed, so the viewer plays the round.
 */
export type BattleMessageKind = "save"|"launch"

/** What the main client sends its viewers: the battle at a rest, and when it was taken. */
export interface BattleMessage {
    readonly kind: BattleMessageKind

    /** Which battle of the run it is, from 1, so a viewer tells a new battle from the next round. */
    readonly number: number

    /** Which message of the battle it is, from 1, so a late one is told from a new one. */
    readonly sequence: number

    /** Are the draw piles hidden, as secret cards? */
    readonly secret: boolean

    readonly save: BattleSave
}

/** A message as sent. */
export function writeBattleMessage(message: BattleMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read: it is no message of a battle, or of another version. */
export function readBattleMessage(text: string): BattleMessage|UnreadableFault {
    const message = readJson(BATTLE_TOPIC.name, text) as Partial<BattleMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isMessage = typeof message === "object" && message !== null
        && (message.kind === "save" || message.kind === "launch")
        && typeof message.number === "number" && typeof message.sequence === "number"
        && typeof message.save === "object" && message.save !== null
    if(!isMessage) return wrongShape(BATTLE_TOPIC.name, text, "message of the battle")
    if(message.save.version !== BATTLE_SAVE_VERSION){
        return wrongVersion(BATTLE_TOPIC.name, text, message.save.version, BATTLE_SAVE_VERSION)
    }
    return message as BattleMessage
}

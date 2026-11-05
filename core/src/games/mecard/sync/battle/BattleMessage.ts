import { BATTLE_SAVE_VERSION } from "../../sim/save/battleSave"
import type { BattleSave } from "../../sim/save/battleSave"

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

/**
 * A message as received.
 *
 * @throws {@link Error} When it is no message of a battle, or of another version of the save.
 */
export function readBattleMessage(text: string): BattleMessage {
    const message = JSON.parse(text) as Partial<BattleMessage>|null
    const isMessage = typeof message === "object" && message !== null
        && (message.kind === "save" || message.kind === "launch")
        && typeof message.number === "number" && typeof message.sequence === "number"
        && typeof message.save === "object" && message.save !== null
    if(!isMessage) throw new Error("A message of the battle came in another shape: is the other client up to date?")
    if(message.save.version !== BATTLE_SAVE_VERSION){
        throw new Error(`The other client saves battles in version ${message.save.version}, this one in ${BATTLE_SAVE_VERSION}.`)
    }
    return message as BattleMessage
}

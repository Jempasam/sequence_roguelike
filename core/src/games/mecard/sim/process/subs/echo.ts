import type { Action } from "../../battle/Action"

/** The actions made to be played again for another unit: told from the others, so an echo is never echoed. */
const echoes = new WeakSet<Action>()

/** An action to give to another unit to play again, a copy that is told as an echo. */
export function echoOf(action: Action): Action {
    const copy: Action = { ...action }
    echoes.add(copy)
    return copy
}

/** Is an action an echo of another: one that processes copying steps leave alone, so two never feed each other? */
export function isEcho(action: Action): boolean {
    return echoes.has(action)
}

import type { SettingValues } from "./Setting"

/** Someone in the game, as the manager sees it. */
export interface GameMember {
    /** What tells it from the others, the same through a lost connection. */
    readonly id: string

    readonly name: string

    /** Is its connection up? */
    readonly connected: boolean

    /**
     * What it set for itself when it joined, by the id of each participant setting of the mode: always fits
     * them, the initial values standing for what was missing or wrong.
     */
    readonly options: SettingValues
}

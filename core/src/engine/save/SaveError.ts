/**
 * Why a save could not be loaded:
 * - `"corrupt"`: unknown magic, wrong length or CRC, unreadable JSON. The save is damaged.
 * - `"too-new"`: the save was written by a more recent version of the game, before going back to an
 *   older one.
 * - `"invalid"`: the save is intact, but a migration or `decode` refuses what it holds.
 */
export type SaveErrorReason = "corrupt"|"too-new"|"invalid"

/**
 * A save that could not be loaded. The save stays where it is: the game decides what to show the player,
 * and whether to offer to remove it.
 */
export class SaveError extends Error {


    constructor(
        /** The key of the save. */
        public readonly key: string,

        /** Why the save could not be loaded. */
        public readonly reason: SaveErrorReason,

        message: string,

        options?: ErrorOptions,
    ){
        super(`Could not load the save "${key}": ${message}`, options)
        this.name = "SaveError"
    }
}

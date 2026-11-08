import type { SaveFormat } from "../../../../engine/save"

import { RUN_SAVE_VERSION } from "./runSave"
import type { RunSave } from "./runSave"

/** The key the run in progress is kept under. */
export const RUN_SLOT_KEY = "mecard-run"

/** How the run in progress is written to the player's storage: as {@link saveRun} writes it. */
export const RUN_SAVE_FORMAT: SaveFormat<RunSave> = {
    version: 1,
    migrations: [],
    encode: save => save,
    decode: json => {
        const save = json as Partial<RunSave>|null
        const sound = typeof save === "object" && save !== null
            && typeof save.rng === "number" && typeof save.gold === "number"
            && Array.isArray(save.heroes) && typeof save.travel === "object" && save.travel !== null
        if(!sound) throw new Error("It is not the save of a run.")
        if(save.version !== RUN_SAVE_VERSION){
            throw new Error(`It is the save of a run of version ${save.version}, not ${RUN_SAVE_VERSION}.`)
        }
        return save as RunSave
    },
}

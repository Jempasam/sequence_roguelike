import { checkValues, initialValues } from "./Setting"
import type { Setting, SettingValue, SettingValues } from "./Setting"

/** A mode, as far as what its participants set for themselves goes. */
export interface ParticipantModed {
    readonly id: string
    readonly participantSettings?: readonly Setting[]
}

/**
 * What this client sets for itself in each mode, kept as long as the screen lives: it comes back when the mode
 * does, and is told to the manager as the client joins.
 */
export class ParticipantChoices {


    /** What the client has set for a mode, the initial values standing for what it did not set. */
    public valuesFor(mode: ParticipantModed): SettingValues {
        const settings = mode.participantSettings ?? []
        const own = this.#chosen.get(mode.id)
        if(own && !checkValues(settings, own)) return own
        return initialValues(settings)
    }

    /** Set one of the settings of a mode. */
    public set(mode: ParticipantModed, setting: Setting, value: SettingValue): void {
        const settings = mode.participantSettings ?? []
        const next = { ...this.valuesFor(mode), [setting.id]: value }
        if(!settings.includes(setting) || setting.check(value)) return
        this.#chosen.set(mode.id, next)
    }


    readonly #chosen = new Map<string, SettingValues>()
}

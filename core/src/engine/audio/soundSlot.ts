import type { SaveFormat } from "../save"

import type { SoundSettingsSave } from "./SoundSettings"

/** The key the sound settings are kept under. */
export const SOUND_SLOT_KEY = "sound-settings"

/** How the sound settings are written down. */
export const SOUND_SETTINGS_FORMAT: SaveFormat<SoundSettingsSave> = {
    version: 1,
    migrations: [],
    encode: state => state,
    decode: json => {
        if(typeof json !== "object" || json === null) throw new Error("The sound settings are not an object.")
        const { master, volumes } = json as { master?: unknown, volumes?: unknown }
        if(typeof master !== "number") throw new Error("The master volume is not a number.")
        if(typeof volumes !== "object" || volumes === null) throw new Error("The volumes are not an object.")
        const read: Record<string, number> = {}
        for(const [channel, volume] of Object.entries(volumes)){
            if(typeof volume !== "number") throw new Error(`The volume of ${channel} is not a number.`)
            read[channel] = volume
        }
        return { master, volumes: read }
    },
}

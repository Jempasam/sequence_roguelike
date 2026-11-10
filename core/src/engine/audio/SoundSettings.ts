import type { SoundFilter } from "./SoundFilter"

/** The volume of a channel nobody set: as loud as the sound is. */
const DEFAULT_VOLUME = 1

/**
 * What the player chose to hear: a master volume, a volume for each channel of sound, and the filters each
 * channel goes through.
 *
 * @remarks
 * The channels are free names, so a game declares its own, as `effects` or `music`. The sound player reads
 * these settings each time it plays, so a change is heard from the next sound.
 */
export class SoundSettings {


    /** Told after a volume or a filter list changed, so a game keeps them: none when nothing listens. */
    public onChanged: ((settings: SoundSettings) => void)|null = null

    /** The volume of everything, from 0, silence, to 1. */
    public get master(): number { return this.#master }

    public set master(volume: number){
        this.#master = clampVolume(volume)
        this.onChanged?.(this)
    }

    /** The volume of a channel, from 0 to 1, as loud as it is when none was set. */
    public volumeOf(channel: string): number {
        return this.#volumes.get(channel) ?? DEFAULT_VOLUME
    }

    /** Set the volume of a channel, from 0 to 1. */
    public setVolume(channel: string, volume: number): void {
        this.#volumes.set(channel, clampVolume(volume))
        this.onChanged?.(this)
    }

    /** The filters a channel goes through, in this order, none when none was set. */
    public filtersOf(channel: string): readonly SoundFilter[] {
        return this.#filters.get(channel) ?? []
    }

    /** Set the filters a channel goes through, in this order. */
    public setFilters(channel: string, filters: readonly SoundFilter[]): void {
        this.#filters.set(channel, [...filters])
        this.onChanged?.(this)
    }

    /** The volumes of the channels set, to write down: see {@link SoundSettings.restore}. */
    public save(): SoundSettingsSave {
        return { master: this.#master, volumes: Object.fromEntries(this.#volumes) }
    }

    /**
     * Take back the volumes a save holds, without telling {@link SoundSettings.onChanged}: they come from
     * where they are kept. The filters are not saved: a game sets them as it starts.
     */
    public restore(save: SoundSettingsSave): void {
        this.#master = clampVolume(save.master)
        this.#volumes.clear()
        for(const [channel, volume] of Object.entries(save.volumes)){
            this.#volumes.set(channel, clampVolume(volume))
        }
    }


    #master = DEFAULT_VOLUME
    readonly #volumes = new Map<string, number>()
    readonly #filters = new Map<string, readonly SoundFilter[]>()
}

/** The volumes of {@link SoundSettings}, as they are written down. */
export interface SoundSettingsSave {
    /** The master volume, from 0 to 1. */
    readonly master: number

    /** The volume of each channel set, from 0 to 1. */
    readonly volumes: Readonly<Record<string, number>>
}

/** A volume kept between silence and the sound as it is. */
function clampVolume(volume: number): number {
    return Math.min(1, Math.max(0, volume))
}

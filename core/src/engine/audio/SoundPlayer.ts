import type { AudioPort, Cancel, Sound, TimerPort } from "../../platform"
import type { Assets, AssetPath } from "../assets"

import type { SoundFilter } from "./SoundFilter"
import type { SoundSettings } from "./SoundSettings"

/** The path of a sound shipped with the game. */
export type SoundPath = Extract<AssetPath, `${string}.wav` | `${string}.ogg`>

/** What one sound is played with, over what its channel gives. */
export interface SoundOptions {
    /** The volume of this sound, as a factor: 1 plays it as it is. */
    readonly volume?: number

    /** The filters this sound goes through, after those of its channel. */
    readonly filters?: readonly SoundFilter[]

    /** How long to wait before it plays, in milliseconds: none, or no timer to wait with, plays it now. */
    readonly delay?: number
}

/**
 * Plays the sounds of the game on channels, as loud and filtered as the player chose.
 *
 * @remarks
 * A sound is loaded and decoded the first time it is asked for, or earlier by {@link SoundPlayer.preload},
 * and the voice starts once it is. A sound that cannot be loaded is told once to `report` and never played:
 * the game goes on silent on that sound rather than stopping.
 */
export class SoundPlayer {


    constructor(
        /** What the player chose to hear. */
        public readonly settings: SoundSettings,

        /** The speakers. */
        public readonly port: AudioPort,

        /** Where the files of the sounds come from. */
        public readonly assets: Assets,

        /** Where what cannot be loaded or decoded is told. */
        public readonly report: (text: string) => void,

        /** What waits for the sounds played late, none when there is none: they then play at once. */
        public readonly timer: TimerPort|null = null,
    ){}


    /** Load sounds, so the first time each is played it starts at once. */
    public preload(paths: readonly SoundPath[]): void {
        for(const path of paths) this.#sound(path)
    }

    /**
     * Play a sound once on a channel. Its volume is the master one, the channel one and its own, and it
     * goes through the filters of its channel, then its own.
     */
    public play(channel: string, path: SoundPath, options: SoundOptions = {}): void {
        if(this.#isDisposed) return
        const { delay = 0 } = options
        if(delay > 0 && this.timer){
            const wait = this.timer.after(delay, () => {
                this.#waits.delete(wait)
                this.#play(channel, path, options)
            })
            this.#waits.add(wait)
            return
        }
        this.#play(channel, path, options)
    }

    /**
     * Let the sounds go, and play none more: a sound still loading is dropped when it arrives, and one still
     * waiting is never played.
     */
    public dispose(): void {
        this.#isDisposed = true
        this.#sounds.clear()
        for(const wait of this.#waits) wait.cancel()
        this.#waits.clear()
    }


    /** The sounds asked for, each loaded once, none when it could not be. */
    readonly #sounds = new Map<SoundPath, Promise<Sound|null>>()
    readonly #waits = new Set<Cancel>()
    #isDisposed = false

    #play(channel: string, path: SoundPath, options: SoundOptions): void {
        void this.#sound(path).then(sound => {
            if(sound && !this.#isDisposed) this.#start(sound, channel, options)
        })
    }

    #sound(path: SoundPath): Promise<Sound|null> {
        const known = this.#sounds.get(path)
        if(known) return known
        const decoded = this.assets.bytes(path).then(bytes => this.port.decode(bytes))
        const loading = decoded.catch((error: unknown) => {
            this.report(`Le son ${path} n'a pas pu être chargé : ${error instanceof Error ? error.message : String(error)}`)
            return null
        })
        this.#sounds.set(path, loading)
        return loading
    }

    #start(sound: Sound, channel: string, options: SoundOptions): void {
        const { settings, port } = this
        const filters = [...settings.filtersOf(channel), ...options.filters ?? []]
        const volume = settings.master * settings.volumeOf(channel) * (options.volume ?? 1)
        port.play(sound, { volume, stages: filters.map(filter => filter.build(port)) })
    }
}

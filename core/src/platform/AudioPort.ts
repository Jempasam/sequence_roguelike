/**
 * A sound decoded and ready to be played, as the adapter holds it. Nothing of it is read outside the
 * adapter that made it.
 */
export interface Sound {
    /** How long it lasts, in seconds. */
    readonly duration: number
}

/**
 * One piece of the chain a sound goes through before it reaches the speakers, as the adapter holds it.
 * Made by a {@link FilterContext}, and played once: a stage is not shared between two sounds.
 */
export type AudioStage = object

/** The kinds of biquad filter the Web Audio API defines. */
export type BiquadKind =
    | "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "peaking" | "notch" | "allpass"

/**
 * What a filter is built from: the stages the adapter can make.
 *
 * @remarks
 * The filters ask for stages and know nothing of the node behind each: the adapter gives Web Audio
 * nodes, a test gives records of what was asked.
 */
export interface FilterContext {
    /** A biquad filter. `gain` only matters to the shelves and the peaking filter. */
    biquad(kind: BiquadKind, frequency: number, quality: number, gain: number): AudioStage

    /** A change of volume, as a factor: 1 changes nothing. */
    gain(volume: number): AudioStage

    /** A move between the left speaker, at -1, and the right one, at 1. */
    pan(position: number): AudioStage

    /**
     * An echo.
     *
     * @param time - The gap between two echoes, in seconds.
     * @param feedback - The part of an echo heard again in the next, from 0 to below 1.
     */
    delay(time: number, feedback: number): AudioStage

    /**
     * A room around the sound.
     *
     * @param duration - How long the room rings, in seconds.
     * @param decay - How fast it fades, from 1, gentle, up.
     */
    reverb(duration: number, decay: number): AudioStage

    /** A dynamics compressor. Levels are in dB, the ratio is of the input change to the output one. */
    compressor(threshold: number, knee: number, ratio: number, attack: number, release: number): AudioStage

    /** A distortion, from 0, which leaves the sound as it is, up. */
    distortion(amount: number): AudioStage
}

/** How a sound is played. */
export interface PlayOptions {
    /** The volume, as a factor: 1 plays the sound as it is. */
    readonly volume: number

    /** The stages it goes through, in this order, before the volume is applied. */
    readonly stages: readonly AudioStage[]
}

/**
 * The speakers of the environment: decodes the sounds shipped with the game and plays them.
 *
 * @remarks
 * Playing starts a voice and returns: voices overlap, and none can be stopped. An environment without
 * speakers is a platform without this port.
 */
export interface AudioPort extends FilterContext {
    /**
     * Decode the bytes of a sound file.
     *
     * @throws {@link Error} When the bytes are not a sound the environment reads.
     */
    decode(bytes: Uint8Array): Promise<Sound>

    /** Play a sound once, through some stages. */
    play(sound: Sound, options: PlayOptions): void
}

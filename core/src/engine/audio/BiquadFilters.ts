import type { AudioStage, BiquadKind, FilterContext } from "../../platform"

import type { SoundFilter } from "./SoundFilter"

/** The sharpness of a biquad filter when none is given: the one that has no bump around its frequency. */
const FLAT_QUALITY = Math.SQRT1_2

/**
 * A biquad filter of one kind, the base of the eight the Web Audio API defines.
 *
 * @remarks
 * Each kind is a class of its own, which says what it does to the sound in its own description and takes
 * the numbers that matter to it.
 */
export abstract class BiquadFilter implements SoundFilter {


    constructor(
        /** The frequency the filter acts around, in Hz. */
        public readonly frequency: number,

        /** How sharp the filter is around its frequency, from 0.0001 up. */
        public readonly quality: number = FLAT_QUALITY,

        /** The boost or cut of the shelves and of the peaking filter, in dB. The other kinds ignore it. */
        public readonly gain: number = 0,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.biquad(this.kind(), this.frequency, this.quality, this.gain)
    }


    /** The kind of biquad the Web Audio API makes for it. */
    protected abstract kind(): BiquadKind
}

/** Lets what is below its frequency through, and dulls the rest: a muffled sound. */
export class LowPass extends BiquadFilter {
    protected kind(): BiquadKind { return "lowpass" }
}

/** Lets what is above its frequency through, and removes the rest: a thin sound. */
export class HighPass extends BiquadFilter {
    protected kind(): BiquadKind { return "highpass" }
}

/** Lets only a band around its frequency through: a telephone voice. */
export class BandPass extends BiquadFilter {
    protected kind(): BiquadKind { return "bandpass" }
}

/** Boosts or cuts what is below its frequency by its gain. */
export class LowShelf extends BiquadFilter {
    protected kind(): BiquadKind { return "lowshelf" }
}

/** Boosts or cuts what is above its frequency by its gain. */
export class HighShelf extends BiquadFilter {
    protected kind(): BiquadKind { return "highshelf" }
}

/** Boosts or cuts a band around its frequency by its gain. */
export class Peaking extends BiquadFilter {
    protected kind(): BiquadKind { return "peaking" }
}

/** Removes a narrow band around its frequency. */
export class Notch extends BiquadFilter {
    protected kind(): BiquadKind { return "notch" }
}

/** Keeps every frequency as loud as it was and shifts their phase: it only matters in a chain. */
export class AllPass extends BiquadFilter {
    protected kind(): BiquadKind { return "allpass" }
}

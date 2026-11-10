import type { AudioStage, FilterContext } from "../../platform"

import type { SoundFilter } from "./SoundFilter"

/** Makes a sound louder or quieter. */
export class Gain implements SoundFilter {


    constructor(
        /** The factor the volume is multiplied by: 1 changes nothing. */
        public readonly volume: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.gain(this.volume)
    }
}

/** Moves a sound between the left speaker and the right one. */
export class Pan implements SoundFilter {


    constructor(
        /** Where it is heard, from -1, the left speaker, to 1, the right one. */
        public readonly position: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.pan(this.position)
    }
}

/** Repeats a sound, each echo quieter than the last. */
export class Delay implements SoundFilter {


    constructor(
        /** The gap between two echoes, in seconds. */
        public readonly time: number,

        /** The part of an echo heard again in the next, from 0 to below 1. */
        public readonly feedback: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.delay(this.time, this.feedback)
    }
}

/** Puts a sound in a room, which rings after it. */
export class Reverb implements SoundFilter {


    constructor(
        /** How long the room rings, in seconds. */
        public readonly duration: number,

        /** How fast it fades, from 1, gentle, up. */
        public readonly decay: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.reverb(this.duration, this.decay)
    }
}

/** Brings the loudest parts of a sound down, so the quietest ones can be heard. */
export class Compressor implements SoundFilter {


    constructor(
        /** The level above which it acts, in dB. */
        public readonly threshold: number,

        /** The width, in dB, of the soft transition around the threshold. */
        public readonly knee: number,

        /** The ratio of the input change to the output one, above the threshold. */
        public readonly ratio: number,

        /** How long it takes to bring the level down, in seconds. */
        public readonly attack: number,

        /** How long it takes to let the level go back up, in seconds. */
        public readonly release: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.compressor(this.threshold, this.knee, this.ratio, this.attack, this.release)
    }
}

/** Roughens a sound by clipping its waves. */
export class Distortion implements SoundFilter {


    constructor(
        /** How much it clips, from 0, which changes nothing, up. */
        public readonly amount: number,
    ){}


    public build(context: FilterContext): AudioStage {
        return context.distortion(this.amount)
    }
}

import type { Sound } from "@game/core"

/** A sound decoded to samples: one array per channel, each sample from -1 to 1. */
export class PcmSound implements Sound {


    constructor(
        /** The samples of each channel, one for a mono sound and two for a stereo one. */
        public readonly channels: readonly Float32Array[],

        /** How many samples each second holds. */
        public readonly sampleRate: number,
    ){}


    public get duration(): number {
        return this.channels[0].length / this.sampleRate
    }
}

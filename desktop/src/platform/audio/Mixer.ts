import type { PcmSound } from "./PcmSound"
import type { DspStage } from "./stages"
import { Voice } from "./Voice"

/** How many frames are rendered at once. */
export const BLOCK = 512

/** Where the limiter starts to bend the samples. */
const KNEE = 0.8

/**
 * Sums voices into blocks of interleaved stereo float samples, the layout the device is given.
 *
 * @remarks
 * It knows nothing of a device: whoever owns it asks for the next block when the device runs low.
 */
export class Mixer {


    readonly #voices: Voice[] = []
    readonly #left = new Float32Array(BLOCK)
    readonly #right = new Float32Array(BLOCK)


    constructor(
        /** How many frames each second holds in the blocks. */
        public readonly rate: number,
    ){}


    /** Whether a voice is still sounding. */
    public get active(): boolean {
        return this.#voices.length > 0
    }


    /** Start a sound, which joins the next blocks. */
    public add(sound: PcmSound, stages: readonly DspStage[], volume: number): void {
        this.#voices.push(new Voice(sound, stages, volume, this.rate, BLOCK))
    }

    /** Write the next block into `out`, as interleaved left and right samples, and return it. */
    public render(out: Float32Array = new Float32Array(BLOCK * 2)): Float32Array {
        this.#left.fill(0)
        this.#right.fill(0)
        for(const voice of this.#voices) voice.mixInto(this.#left, this.#right, BLOCK)
        for(let i = this.#voices.length - 1; i >= 0; i--){
            if(this.#voices[i].done) this.#voices.splice(i, 1)
        }
        for(let i = 0; i < BLOCK; i++){
            out[2 * i] = clip(this.#left[i])
            out[2 * i + 1] = clip(this.#right[i])
        }
        return out
    }
}

/** A sample kept between -1 and 1: left as it is up to the knee, bent smoothly above it. */
function clip(sample: number): number {
    const level = Math.abs(sample)
    if(level <= KNEE) return sample
    const room = 1 - KNEE
    return Math.sign(sample) * (KNEE + room * Math.tanh((level - KNEE) / room))
}

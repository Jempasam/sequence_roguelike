import type { PcmSound } from "./PcmSound"
import type { DspStage } from "./stages"

/** One sound being played: its samples read at the rate of the device, through its stages, at its volume. */
export class Voice {


    readonly #sound: PcmSound
    readonly #stages: readonly DspStage[]
    readonly #volume: number
    readonly #step: number
    readonly #total: number
    readonly #left: Float32Array
    readonly #right: Float32Array
    #position = 0
    #rendered = 0


    constructor(sound: PcmSound, stages: readonly DspStage[], volume: number, rate: number, block: number) {
        this.#sound = sound
        this.#stages = stages
        this.#volume = volume
        this.#step = sound.sampleRate / rate
        const tail = stages.reduce((sum, stage) => sum + stage.tail, 0)
        this.#total = Math.ceil(sound.channels[0].length / this.#step) + Math.ceil(tail * rate)
        this.#left = new Float32Array(block)
        this.#right = new Float32Array(block)
    }


    /** Whether everything it has to say, its tail included, was given. */
    public get done(): boolean {
        return this.#rendered >= this.#total
    }


    /** Add the next `length` frames of the voice to the sums of each side. */
    public mixInto(left: Float32Array, right: Float32Array, length: number): void {
        const { channels } = this.#sound
        const source = channels[0].length
        const first = channels[0]
        const second = channels[1] ?? first
        for(let i = 0; i < length; i++){
            const at = this.#position
            const index = Math.floor(at)
            if(index < source){
                const next = Math.min(index + 1, source - 1)
                const mix = at - index
                this.#left[i] = first[index] + (first[next] - first[index]) * mix
                this.#right[i] = second[index] + (second[next] - second[index]) * mix
            }
            else {
                this.#left[i] = 0
                this.#right[i] = 0
            }
            this.#position += this.#step
        }
        for(const stage of this.#stages) stage.process(this.#left, this.#right, length)
        for(let i = 0; i < length; i++){
            left[i] += this.#left[i] * this.#volume
            right[i] += this.#right[i] * this.#volume
        }
        this.#rendered += length
    }
}

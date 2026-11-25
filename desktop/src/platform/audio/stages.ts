import type { AudioStage, BiquadKind } from "@game/core"

/** The level under which an echo or a room is taken as gone, as a factor. */
const SILENCE = 0.001

/** The longest an echo is kept ringing, in seconds. */
const MAX_ECHO_TAIL = 5

/** The delays of the combs of a room, in samples at 44100 Hz. */
const COMB_DELAYS = [1116, 1188, 1277, 1356]

/** The delays of the allpass filters of a room, in samples at 44100 Hz. */
const ALLPASS_DELAYS = [556, 441]

/** The sample rate the delays of a room are given at. */
const ROOM_RATE = 44100

/** How many samples more the delays of the right side of a room have than the left side. */
const STEREO_SPREAD = 23

/** How loud the room is heard next to the sound that made it. */
const ROOM_LEVEL = 0.25

/**
 * One piece of the chain of a voice, working on its samples in place.
 *
 * @remarks
 * A stage keeps what it needs between two blocks and is played once, as the port promises.
 */
export abstract class DspStage implements AudioStage {


    /** How long the stage goes on sounding after what enters it has stopped, in seconds. */
    public readonly tail: number = 0


    /** Change the first `length` samples of each side. */
    public abstract process(left: Float32Array, right: Float32Array, length: number): void
}

/** A biquad filter, on the formulas of the Web Audio API. */
export class BiquadStage extends DspStage {


    #b0 = 1
    #b1 = 0
    #b2 = 0
    #a1 = 0
    #a2 = 0
    readonly #memory = [new Float64Array(4), new Float64Array(4)]


    constructor(kind: BiquadKind, frequency: number, quality: number, gain: number, rate: number) {
        super()
        this.#configure(kind, Math.min(Math.max(frequency, 1), rate / 2 - 1), quality, gain, rate)
    }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        this.#run(left, length, this.#memory[0])
        this.#run(right, length, this.#memory[1])
    }


    /** Filter the samples of one side, with the last inputs and outputs it left in `memory`. */
    #run(samples: Float32Array, length: number, memory: Float64Array): void {
        let [x1, x2, y1, y2] = memory
        for(let i = 0; i < length; i++){
            const x0 = samples[i]
            const y0 = this.#b0 * x0 + this.#b1 * x1 + this.#b2 * x2 - this.#a1 * y1 - this.#a2 * y2
            x2 = x1
            x1 = x0
            y2 = y1
            y1 = y0
            samples[i] = y0
        }
        memory[0] = x1
        memory[1] = x2
        memory[2] = y1
        memory[3] = y2
    }

    #configure(kind: BiquadKind, frequency: number, quality: number, gain: number, rate: number): void {
        const w0 = 2 * Math.PI * frequency / rate
        const cos = Math.cos(w0)
        const sin = Math.sin(w0)
        const linearQuality = Math.max(quality, 0.0001)
        const alpha = sin / (2 * linearQuality)
        const alphaDb = sin / (2 * 10 ** (quality / 20))
        const amplitude = 10 ** (gain / 40)
        const shelf = 2 * Math.sqrt(amplitude) * alpha
        let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0
        switch(kind){
            case "lowpass":
                b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0
                a0 = 1 + alphaDb; a1 = -2 * cos; a2 = 1 - alphaDb
                break
            case "highpass":
                b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0
                a0 = 1 + alphaDb; a1 = -2 * cos; a2 = 1 - alphaDb
                break
            case "bandpass":
                b0 = alpha; b1 = 0; b2 = -alpha
                a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha
                break
            case "notch":
                b0 = 1; b1 = -2 * cos; b2 = 1
                a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha
                break
            case "allpass":
                b0 = 1 - alpha; b1 = -2 * cos; b2 = 1 + alpha
                a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha
                break
            case "peaking":
                b0 = 1 + alpha * amplitude; b1 = -2 * cos; b2 = 1 - alpha * amplitude
                a0 = 1 + alpha / amplitude; a1 = -2 * cos; a2 = 1 - alpha / amplitude
                break
            case "lowshelf":
                b0 = amplitude * (amplitude + 1 - (amplitude - 1) * cos + shelf)
                b1 = 2 * amplitude * (amplitude - 1 - (amplitude + 1) * cos)
                b2 = amplitude * (amplitude + 1 - (amplitude - 1) * cos - shelf)
                a0 = amplitude + 1 + (amplitude - 1) * cos + shelf
                a1 = -2 * (amplitude - 1 + (amplitude + 1) * cos)
                a2 = amplitude + 1 + (amplitude - 1) * cos - shelf
                break
            case "highshelf":
                b0 = amplitude * (amplitude + 1 + (amplitude - 1) * cos + shelf)
                b1 = -2 * amplitude * (amplitude - 1 + (amplitude + 1) * cos)
                b2 = amplitude * (amplitude + 1 + (amplitude - 1) * cos - shelf)
                a0 = amplitude + 1 - (amplitude - 1) * cos + shelf
                a1 = 2 * (amplitude - 1 - (amplitude + 1) * cos)
                a2 = amplitude + 1 - (amplitude - 1) * cos - shelf
                break
        }
        this.#b0 = b0 / a0
        this.#b1 = b1 / a0
        this.#b2 = b2 / a0
        this.#a1 = a1 / a0
        this.#a2 = a2 / a0
    }
}

/** A change of volume. */
export class GainStage extends DspStage {


    constructor(
        /** The factor the samples are multiplied by. */
        public readonly volume: number,
    ){ super() }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        for(let i = 0; i < length; i++){
            left[i] *= this.volume
            right[i] *= this.volume
        }
    }
}

/** A move between the speakers, as the stereo panner of the Web Audio API makes it. */
export class PanStage extends DspStage {


    readonly #left: number
    readonly #right: number
    readonly #toRight: boolean


    constructor(position: number) {
        super()
        const clamped = Math.min(Math.max(position, -1), 1)
        this.#toRight = clamped > 0
        const angle = (this.#toRight ? clamped : clamped + 1) * Math.PI / 2
        this.#left = Math.cos(angle)
        this.#right = Math.sin(angle)
    }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        for(let i = 0; i < length; i++){
            const l = left[i]
            const r = right[i]
            if(this.#toRight){
                left[i] = l * this.#left
                right[i] = r + l * this.#right
            }
            else {
                left[i] = l + r * this.#left
                right[i] = r * this.#right
            }
        }
    }
}

/** An echo: the sound, then its repeats, each one quieter than the one before. */
export class DelayStage extends DspStage {


    public override readonly tail: number
    readonly #lines: Float32Array[]
    readonly #feedback: number
    #at = 0


    constructor(time: number, feedback: number, rate: number) {
        super()
        const length = Math.max(1, Math.round(time * rate))
        this.#lines = [new Float32Array(length), new Float32Array(length)]
        this.#feedback = feedback
        const repeats = feedback > 0 ? Math.ceil(Math.log(SILENCE) / Math.log(feedback)) : 1
        this.tail = Math.min(MAX_ECHO_TAIL, time * Math.max(1, repeats))
    }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        const size = this.#lines[0].length
        for(let i = 0; i < length; i++){
            const echoes = [this.#lines[0][this.#at], this.#lines[1][this.#at]]
            this.#lines[0][this.#at] = left[i] + echoes[0] * this.#feedback
            this.#lines[1][this.#at] = right[i] + echoes[1] * this.#feedback
            left[i] += echoes[0]
            right[i] += echoes[1]
            this.#at = (this.#at + 1) % size
        }
    }
}

/** A comb filter of a room: a delay line that feeds back on itself, one side of it. */
class Comb {


    readonly #line: Float32Array
    readonly #feedback: number
    #at = 0


    constructor(size: number, feedback: number) {
        this.#line = new Float32Array(size)
        this.#feedback = feedback
    }


    public next(input: number): number {
        const out = this.#line[this.#at]
        this.#line[this.#at] = input + out * this.#feedback
        this.#at = (this.#at + 1) % this.#line.length
        return out
    }
}

/** An allpass filter of a room, which blurs the echoes of the combs, one side of it. */
class Allpass {


    readonly #line: Float32Array
    #at = 0


    constructor(size: number) {
        this.#line = new Float32Array(size)
    }


    public next(input: number): number {
        const buffered = this.#line[this.#at]
        const out = buffered - input
        this.#line[this.#at] = input + buffered * 0.5
        this.#at = (this.#at + 1) % this.#line.length
        return out
    }
}

/** A room around the sound, as combs and allpass filters. */
export class ReverbStage extends DspStage {


    public override readonly tail: number
    readonly #sides: { combs: Comb[], allpasses: Allpass[] }[]


    constructor(duration: number, decay: number, rate: number) {
        super()
        const ring = Math.max(duration, 0.05) / Math.max(1, decay)
        this.tail = duration
        const scale = rate / ROOM_RATE
        this.#sides = [0, STEREO_SPREAD].map(spread => ({
            combs: COMB_DELAYS.map(delay => {
                const size = Math.round(delay * scale) + spread
                return new Comb(size, 10 ** (-3 * size / (rate * ring)))
            }),
            allpasses: ALLPASS_DELAYS.map(delay => new Allpass(Math.round(delay * scale) + spread)),
        }))
    }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        this.#side(left, length, this.#sides[0])
        this.#side(right, length, this.#sides[1])
    }


    /** Add the room to the samples of one side. */
    #side(samples: Float32Array, length: number, side: { combs: Comb[], allpasses: Allpass[] }): void {
        for(let i = 0; i < length; i++){
            const input = samples[i]
            let wet = 0
            for(const comb of side.combs) wet += comb.next(input)
            for(const allpass of side.allpasses) wet = allpass.next(wet)
            samples[i] = input + wet * ROOM_LEVEL
        }
    }
}

/** A dynamics compressor: the loud parts are pulled down toward the threshold. */
export class CompressorStage extends DspStage {


    readonly #attack: number
    readonly #release: number
    #reduction = 0


    constructor(
        /** The level above which the sound is pulled down, in dB. */
        public readonly threshold: number,

        /** The width around the threshold where the pull grows gently, in dB. */
        public readonly knee: number,

        /** The input change that makes one dB of output change above the threshold. */
        public readonly ratio: number,
        attack: number,
        release: number,
        rate: number,
    ){
        super()
        this.#attack = Math.exp(-1 / (Math.max(attack, 0.0001) * rate))
        this.#release = Math.exp(-1 / (Math.max(release, 0.0001) * rate))
    }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        for(let i = 0; i < length; i++){
            const level = Math.max(Math.abs(left[i]), Math.abs(right[i]), 1e-9)
            const target = this.#target(20 * Math.log10(level))
            const coefficient = target < this.#reduction ? this.#attack : this.#release
            this.#reduction = target + coefficient * (this.#reduction - target)
            const factor = 10 ** (this.#reduction / 20)
            left[i] *= factor
            right[i] *= factor
        }
    }


    /** The reduction, in dB and no more than 0, that a level in dB asks for. */
    #target(level: number): number {
        const over = level - this.threshold
        const slope = 1 / this.ratio - 1
        if(2 * over < -this.knee) return 0
        if(this.knee > 0 && 2 * Math.abs(over) <= this.knee){
            return slope * (over + this.knee / 2) ** 2 / (2 * this.knee)
        }
        return slope * over
    }
}

/** A distortion: the samples are bent toward the extremes, the more the higher the amount. */
export class DistortionStage extends DspStage {


    constructor(
        /** How much the samples are bent, from 0, which changes nothing. */
        public readonly amount: number,
    ){ super() }


    public process(left: Float32Array, right: Float32Array, length: number): void {
        for(let i = 0; i < length; i++){
            left[i] = this.#bend(left[i])
            right[i] = this.#bend(right[i])
        }
    }


    #bend(x: number): number {
        const clamped = Math.min(Math.max(x, -1), 1)
        return (1 + this.amount) * clamped / (1 + this.amount * Math.abs(clamped))
    }
}

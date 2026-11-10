import type { AudioPort, AudioStage, BiquadKind, PlayOptions, Sound } from "@game/core"

/** How many points the curve of a distortion holds. */
const CURVE_POINTS = 1024

/** A sound the browser decoded. */
class WebSound implements Sound {


    constructor(
        /** The decoded samples. */
        public readonly buffer: AudioBuffer,
    ){}


    public get duration(): number { return this.buffer.duration }
}

/** A piece of a chain of Web Audio nodes: what comes in enters `input`, and what goes out leaves `output`. */
class WebStage implements AudioStage {


    constructor(
        /** The node the sound enters. */
        public readonly input: AudioNode,

        /** The node the sound leaves from, the same as `input` for a single node. */
        public readonly output: AudioNode = input,
    ){}
}

/**
 * The speakers of the browser, on the Web Audio API.
 *
 * @remarks
 * A browser keeps its audio context suspended until the user acts on the page, so each sound asks for it to
 * run: the first ones played before any click are lost, the next ones are heard.
 */
export class WebAudio implements AudioPort {


    constructor(
        /** The context sounds are decoded and played in. */
        public readonly context: AudioContext,
    ){}


    public decode(bytes: Uint8Array): Promise<Sound> {
        // Copied, since the context takes the buffer it is given.
        return this.context.decodeAudioData(bytes.slice().buffer).then(buffer => new WebSound(buffer))
    }

    public play(sound: Sound, { volume, stages }: PlayOptions): void {
        if(!(sound instanceof WebSound)) throw new Error("This sound was not decoded by the browser audio.")
        const { context } = this
        void context.resume()
        const source = context.createBufferSource()
        source.buffer = sound.buffer
        const master = context.createGain()
        master.gain.value = volume
        let last: AudioNode = source
        for(const stage of stages){
            const web = this.#stage(stage)
            last.connect(web.input)
            last = web.output
        }
        last.connect(master)
        master.connect(context.destination)
        source.start()
    }

    public biquad(kind: BiquadKind, frequency: number, quality: number, gain: number): AudioStage {
        const node = this.context.createBiquadFilter()
        node.type = kind
        node.frequency.value = frequency
        node.Q.value = quality
        node.gain.value = gain
        return new WebStage(node)
    }

    public gain(volume: number): AudioStage {
        const node = this.context.createGain()
        node.gain.value = volume
        return new WebStage(node)
    }

    public pan(position: number): AudioStage {
        const node = this.context.createStereoPanner()
        node.pan.value = position
        return new WebStage(node)
    }

    public delay(time: number, feedback: number): AudioStage {
        const { context } = this
        const input = context.createGain()
        const output = context.createGain()
        const delay = context.createDelay(Math.max(time, 0.001))
        delay.delayTime.value = time
        const again = context.createGain()
        again.gain.value = feedback
        // The sound is heard as it is, then in its echoes.
        input.connect(output)
        input.connect(delay)
        delay.connect(output)
        delay.connect(again)
        again.connect(delay)
        return new WebStage(input, output)
    }

    public reverb(duration: number, decay: number): AudioStage {
        const { context } = this
        const input = context.createGain()
        const output = context.createGain()
        const room = context.createConvolver()
        room.buffer = this.#room(duration, decay)
        input.connect(output)
        input.connect(room)
        room.connect(output)
        return new WebStage(input, output)
    }

    public compressor(
        threshold: number, knee: number, ratio: number, attack: number, release: number,
    ): AudioStage {
        const node = this.context.createDynamicsCompressor()
        node.threshold.value = threshold
        node.knee.value = knee
        node.ratio.value = ratio
        node.attack.value = attack
        node.release.value = release
        return new WebStage(node)
    }

    public distortion(amount: number): AudioStage {
        const node = this.context.createWaveShaper()
        node.curve = distortionCurve(amount)
        node.oversample = "4x"
        return new WebStage(node)
    }


    #stage(stage: AudioStage): WebStage {
        if(!(stage instanceof WebStage)) throw new Error("This stage was not made by the browser audio.")
        return stage
    }

    /** The impulse of a room: noise that fades, so a sound rings in it. */
    #room(duration: number, decay: number): AudioBuffer {
        const { context } = this
        const length = Math.max(1, Math.floor(duration * context.sampleRate))
        const impulse = context.createBuffer(2, length, context.sampleRate)
        for(let channel = 0; channel < 2; channel++){
            const samples = impulse.getChannelData(channel)
            for(let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
        }
        return impulse
    }
}

/** The curve of a distortion: the identity for 0, flattened the higher it goes. */
function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(CURVE_POINTS)
    for(let i = 0; i < CURVE_POINTS; i++){
        const x = i * 2 / (CURVE_POINTS - 1) - 1
        curve[i] = amount === 0 ? x : (1 + amount) * x / (1 + amount * Math.abs(x))
    }
    return curve
}

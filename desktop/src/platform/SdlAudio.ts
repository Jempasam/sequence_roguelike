import { audio } from "@kmamal/sdl"
import type { AudioPort, AudioStage, BiquadKind, PlayOptions, Sound } from "@game/core"

import { decodeSound } from "./audio/decodeSound"
import { BLOCK, Mixer } from "./audio/Mixer"
import { PcmSound } from "./audio/PcmSound"
import {
    BiquadStage, CompressorStage, DelayStage, DistortionStage, DspStage, GainStage, PanStage, ReverbStage,
} from "./audio/stages"

/** The sample rate asked of the device. */
const RATE = 48000

/** How many bytes a frame takes in the device: two sides of a 32 bits float. */
const FRAME_BYTES = 8

/**
 * How many frames are kept queued in the device, which is the delay before a new sound is heard and the
 * longest the main thread can stall, rendering a frame of the game, before the speakers run dry.
 */
const QUEUED_FRAMES = BLOCK * 8

/** How many frames the driver buffers: the less, the sooner the queue is heard. */
const DRIVER_FRAMES = 1024

/** How often the queue of the device is topped up, in milliseconds. */
const PUMP_MS = 5

/** The playback of an opened device, as much of it as the adapter uses. */
interface Playback {
    readonly frequency: number
    readonly queued: number
    play(): void
    enqueue(buffer: Buffer): void
}

/**
 * The speakers of the desktop, on the audio of SDL.
 *
 * @remarks
 * Sounds are decoded to samples and summed by a software mixer, which keeps the queue of the device
 * filled for as long as a voice sounds. Without a device the game goes on in silence.
 */
export class SdlAudio implements AudioPort {


    readonly #playback: Playback | null
    readonly #mixer: Mixer
    readonly #block = new Float32Array(BLOCK * 2)
    #pump: ReturnType<typeof setInterval> | null = null


    constructor() {
        this.#playback = openPlayback()
        this.#mixer = new Mixer(this.#playback?.frequency ?? RATE)
        this.#playback?.play()
    }


    public decode(bytes: Uint8Array): Promise<Sound> {
        return decodeSound(bytes)
    }

    public play(sound: Sound, { volume, stages }: PlayOptions): void {
        if(!(sound instanceof PcmSound)) throw new Error("This sound was not decoded by the desktop audio.")
        if(this.#playback === null) return
        this.#mixer.add(sound, stages.map(stage => this.#stage(stage)), volume)
        this.#pump ??= setInterval(() => this.#fill(), PUMP_MS)
        this.#fill()
    }

    public biquad(kind: BiquadKind, frequency: number, quality: number, gain: number): AudioStage {
        return new BiquadStage(kind, frequency, quality, gain, this.#mixer.rate)
    }

    public gain(volume: number): AudioStage {
        return new GainStage(volume)
    }

    public pan(position: number): AudioStage {
        return new PanStage(position)
    }

    public delay(time: number, feedback: number): AudioStage {
        return new DelayStage(time, feedback, this.#mixer.rate)
    }

    public reverb(duration: number, decay: number): AudioStage {
        return new ReverbStage(duration, decay, this.#mixer.rate)
    }

    public compressor(
        threshold: number, knee: number, ratio: number, attack: number, release: number,
    ): AudioStage {
        return new CompressorStage(threshold, knee, ratio, attack, release, this.#mixer.rate)
    }

    public distortion(amount: number): AudioStage {
        return new DistortionStage(amount)
    }


    #stage(stage: AudioStage): DspStage {
        if(!(stage instanceof DspStage)) throw new Error("This stage was not made by the desktop audio.")
        return stage
    }

    /** Give the device blocks until its queue is full, and stop the pump once no voice sounds. */
    #fill(): void {
        const playback = this.#playback
        if(playback === null) return
        while(this.#mixer.active && playback.queued < QUEUED_FRAMES * FRAME_BYTES){
            const samples = this.#mixer.render(this.#block)
            playback.enqueue(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
        }
        if(!this.#mixer.active && this.#pump !== null){
            clearInterval(this.#pump)
            this.#pump = null
        }
    }
}

/** Open the default device for stereo float playback, or null when there is none. */
function openPlayback(): Playback | null {
    try {
        return audio.openDevice({ type: "playback" }, {
            channels: 2,
            frequency: RATE,
            format: "f32",
            buffered: DRIVER_FRAMES,
        })
    }
    catch(error){
        console.error("No audio device, the game goes on without sound:", error)
        return null
    }
}

import * as engine from "./engine.c"
import type { StageCall, StageMethod } from "./protocol"

/** The functions of the engine that add a stage to a voice, by the name a {@link StageCall} gives. */
const STAGES: Record<StageMethod, (voice: number, ...args: number[]) => void> = {
    biquad: engine.stage_biquad,
    gain: engine.stage_gain,
    pan: engine.stage_pan,
    delay: engine.stage_delay,
    reverb: engine.stage_reverb,
    compressor: engine.stage_compressor,
    distortion: engine.stage_distortion,
}

/**
 * The audio engine written in C, as TypeScript uses it: sounds are kept, played through stages, and
 * rendered in blocks of interleaved stereo float samples.
 *
 * @remarks
 * It knows nothing of a device or a thread: it is the same in the worker that feeds the speakers and in a
 * test that reads the blocks.
 */
export class AudioEngine {


    constructor(rate: number) {
        engine.engine_init(rate)
    }


    /** How many voices are sounding. */
    public get voices(): number {
        return engine.engine_voices()
    }

    /** How many frames at most a block holds. */
    public get block(): number {
        return engine.engine_block()
    }


    /**
     * Keep a sound, one array of samples for each side: one for a mono sound and two for a stereo one.
     *
     * @returns Its id, to play it with.
     * @throws {@link Error} When the engine cannot keep it.
     */
    public addSound(channels: readonly Float32Array[], sampleRate: number): number {
        const left = this.#copy(channels[0])
        const right = channels.length > 1 ? this.#copy(channels[1]) : 0
        const id = engine.sound_add(left, right, channels[0].length, sampleRate)
        if(id < 0) throw new Error("The audio engine could not keep this sound.")
        return id
    }

    /** Play a sound once, through some stages and at a volume. */
    public play(sound: number, volume: number, stages: readonly StageCall[]): void {
        const voice = engine.voice_open(sound, volume)
        if(voice < 0) return
        for(const { method, args } of stages) STAGES[method](voice, ...args)
        engine.voice_start(voice)
    }

    /**
     * Render the next `frames` frames of every voice, as interleaved left and right samples. The block
     * is the memory of the engine: it holds until the next call.
     */
    public render(frames: number): Float32Array {
        const pointer = engine.engine_render(frames)
        return new Float32Array(engine.memory.buffer, pointer, Math.min(frames, this.block) * 2)
    }


    /** Copy samples into the memory of the engine, and return where they are. */
    #copy(samples: Float32Array): number {
        const pointer = engine.engine_alloc(samples.byteLength)
        if(pointer === 0) throw new Error("The audio engine is out of memory.")
        new Float32Array(engine.memory.buffer, pointer, samples.length).set(samples)
        return pointer
    }
}

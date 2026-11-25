import { Worker } from "node:worker_threads"
import type { AudioPort, AudioStage, BiquadKind, PlayOptions, Sound } from "@game/core"

import { BIQUAD_KINDS } from "./protocol"
import type { StageCall, StageMethod, Wire, WorkerReplies, WorkerRequests, WorkerStart } from "./protocol"

/** A sound the worker decoded and keeps. */
class WorkerSound implements Sound {


    constructor(
        /** Its id in the engine of the worker. */
        public readonly id: number,

        public readonly duration: number,
    ){}
}

/** A stage to be made in the worker: the method of the engine that makes it and its numbers. */
class WorkerStage implements AudioStage {


    constructor(
        public readonly method: StageMethod,
        public readonly args: readonly number[],
    ){}


    /** What crosses to the worker. */
    public get call(): StageCall {
        return { method: this.method, args: this.args }
    }
}

/** A decoding the worker has not answered yet. */
interface Pending {
    readonly resolve: (sound: Sound) => void
    readonly reject: (error: Error) => void
}

/**
 * The speakers of the desktop, on the audio of SDL, kept out of the main thread.
 *
 * @remarks
 * The sounds are decoded, mixed and sent to the device by a worker running the audio engine written in C
 * (`engine.c`), so a slow frame of the game never leaves the speakers without samples. This side only
 * sends requests. Without a device, or if the worker dies, the game goes on in silence.
 */
export class SdlWorkerAudio implements AudioPort {


    readonly #worker: Worker
    readonly #pending = new Map<number, Pending>()
    #next = 0
    #alive = true


    constructor(
        /** The file of the worker, built next to the game. */
        file: string,

        /** The file of the `sdl.node` addon the worker drives the device with. */
        addon: string,
    ){
        this.#worker = new Worker(file, { workerData: { addon } satisfies WorkerStart })
        this.#worker.unref()
        this.#worker.on("message", (message: Wire<WorkerReplies>) => this.#received(message))
        this.#worker.on("error", error => this.#died(error.message))
        this.#worker.on("exit", () => this.#died("the worker stopped"))
    }


    public decode(bytes: Uint8Array): Promise<Sound> {
        if(!this.#alive) return Promise.reject(new Error("The audio worker is not running."))
        const id = this.#next++
        const copy = bytes.slice()
        return new Promise((resolve, reject) => {
            this.#pending.set(id, { resolve, reject })
            this.#send("decode", { id, bytes: copy }, [copy.buffer])
        })
    }

    public play(sound: Sound, { volume, stages }: PlayOptions): void {
        if(!(sound instanceof WorkerSound)) throw new Error("This sound was not decoded by the desktop audio.")
        if(!this.#alive) return
        const calls = stages.map(stage => this.#stage(stage).call)
        this.#send("play", { sound: sound.id, volume, stages: calls })
    }

    public biquad(kind: BiquadKind, frequency: number, quality: number, gain: number): AudioStage {
        return new WorkerStage("biquad", [BIQUAD_KINDS.indexOf(kind), frequency, quality, gain])
    }

    public gain(volume: number): AudioStage {
        return new WorkerStage("gain", [volume])
    }

    public pan(position: number): AudioStage {
        return new WorkerStage("pan", [position])
    }

    public delay(time: number, feedback: number): AudioStage {
        return new WorkerStage("delay", [time, feedback])
    }

    public reverb(duration: number, decay: number): AudioStage {
        return new WorkerStage("reverb", [duration, decay])
    }

    public compressor(
        threshold: number, knee: number, ratio: number, attack: number, release: number,
    ): AudioStage {
        return new WorkerStage("compressor", [threshold, knee, ratio, attack, release])
    }

    public distortion(amount: number): AudioStage {
        return new WorkerStage("distortion", [amount])
    }


    #stage(stage: AudioStage): WorkerStage {
        if(!(stage instanceof WorkerStage)) throw new Error("This stage was not made by the desktop audio.")
        return stage
    }

    #send<Name extends keyof WorkerRequests>(
        name: Name, body: WorkerRequests[Name], transfer: ArrayBuffer[] = [],
    ): void {
        this.#worker.postMessage({ name, body }, transfer)
    }

    #received(message: Wire<WorkerReplies>): void {
        if(message.name === "failed"){
            console.error("No audio device, the game goes on without sound:", message.body.message)
            return
        }
        const { id } = message.body
        const pending = this.#pending.get(id)
        this.#pending.delete(id)
        if(message.name === "decoded") pending?.resolve(new WorkerSound(message.body.sound, message.body.duration))
        else pending?.reject(new Error(message.body.message))
    }

    /** The worker is gone: what waited for it fails, and the game goes on without sound. */
    #died(reason: string): void {
        if(!this.#alive) return
        this.#alive = false
        console.error(`The audio worker is gone, the game goes on without sound: ${reason}`)
        for(const pending of this.#pending.values()) pending.reject(new Error(`The audio worker is gone: ${reason}`))
        this.#pending.clear()
    }
}

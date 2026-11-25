import { createRequire } from "node:module"
import { parentPort, workerData } from "node:worker_threads"

import { AudioEngine } from "./AudioEngine"
import { decodeSound } from "../audio/decodeSound"
import { AUDIO_RATE } from "./protocol"
import type { DecodeRequest, PlayRequest, Wire, WorkerReplies, WorkerRequests, WorkerStart } from "./protocol"

/** The SDL number of 32 bits float samples in the machine byte order. */
const SDL_AUDIO_F32 = 0x8120

/** How many frames the driver buffers: the less, the sooner the queue is heard. */
const DRIVER_FRAMES = 1024

/** How many frames are rendered at once. */
const BLOCK_FRAMES = 512

/** How many frames are kept queued in the device, which is the delay before a new sound is heard. */
const QUEUED_FRAMES = BLOCK_FRAMES * 6

/** How many bytes a frame takes in the device: two sides of a 32 bits float. */
const FRAME_BYTES = 8

/** How often the queue of the device is topped up, in milliseconds. */
const PUMP_MS = 5

/** The part of the addon of SDL this worker uses: the calls of its audio, which any thread may make. */
interface SdlAudioBinding {
    audio_open(
        name: string | null, isCapture: boolean, frequency: number, format: number, channels: number,
        samples: number,
    ): number
    audio_play(device: number, play: boolean): void
    audio_getQueueSize(device: number): number
    audio_enqueue(device: number, buffer: Buffer, bytes: number): void
}

/** An open device and the addon that drives it. */
interface Speakers {
    readonly binding: SdlAudioBinding
    readonly device: number
}

const port = parentPort
if(port === null) throw new Error("This file is a worker: it is not run on its own.")
const engine = new AudioEngine(AUDIO_RATE)
const speakers = openSpeakers((workerData as WorkerStart).addon)
let pump: ReturnType<typeof setInterval> | null = null

port.on("message", (message: Wire<WorkerRequests>) => {
    if(message.name === "decode") void decode(message.body)
    else play(message.body)
})


/**
 * Open the default device for stereo float playback, or tell the main thread there is none.
 *
 * @remarks
 * The JavaScript of `@kmamal/sdl` refuses to load outside the main thread, and its global setup would
 * move the SDL of the window to this one. So the worker loads the addon alone and only opens a device,
 * which SDL lets any thread do once the main thread has set its audio up.
 */
function openSpeakers(addon: string): Speakers | null {
    try {
        const binding = createRequire(import.meta.url)(addon) as SdlAudioBinding
        const device = binding.audio_open(null, false, AUDIO_RATE, SDL_AUDIO_F32, 2, DRIVER_FRAMES)
        binding.audio_play(device, true)
        return { binding, device }
    }
    catch(error){
        reply("failed", { message: messageOf(error) })
        return null
    }
}

/** Decode a sound file and keep it in the engine. */
async function decode({ id, bytes }: DecodeRequest): Promise<void> {
    try {
        const sound = await decodeSound(bytes)
        const kept = engine.addSound(sound.channels, sound.sampleRate)
        reply("decoded", { id, sound: kept, duration: sound.duration })
    }
    catch(error){
        reply("decodeFailed", { id, message: messageOf(error) })
    }
}

/** Start a sound, and keep the device fed while it sounds. */
function play({ sound, volume, stages }: PlayRequest): void {
    if(speakers === null) return
    engine.play(sound, volume, stages)
    pump ??= setInterval(fill, PUMP_MS)
    fill()
}

/** Give the device blocks until its queue is full, and stop the pump once no voice sounds. */
function fill(): void {
    if(speakers === null) return
    const { binding, device } = speakers
    while(engine.voices > 0 && binding.audio_getQueueSize(device) < QUEUED_FRAMES * FRAME_BYTES){
        const samples = engine.render(BLOCK_FRAMES)
        const bytes = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)
        binding.audio_enqueue(device, bytes, bytes.length)
    }
    if(engine.voices === 0 && pump !== null){
        clearInterval(pump)
        pump = null
    }
}

function reply<Name extends keyof WorkerReplies>(name: Name, body: WorkerReplies[Name]): void {
    port?.postMessage({ name, body })
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

import type { BiquadKind } from "@game/core"

/** The sample rate the engine renders at and the device is opened at. */
export const AUDIO_RATE = 48000

/** The kinds of biquad filter, in the order engine.c numbers them. */
export const BIQUAD_KINDS: readonly BiquadKind[] = [
    "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass",
]

/** The stages the engine makes, named as the methods of {@link AudioEngine} that make them. */
export type StageMethod = "biquad" | "gain" | "pan" | "delay" | "reverb" | "compressor" | "distortion"

/** A stage of a sound, as it crosses to the worker: the method that makes it and its numbers. */
export interface StageCall {
    readonly method: StageMethod
    readonly args: readonly number[]
}

/** What the worker is started with. */
export interface WorkerStart {
    /** The file of the `sdl.node` addon, which the worker loads itself since the package refuses it. */
    readonly addon: string
}

/** Decode the bytes of a sound file and keep the sound. */
export interface DecodeRequest {
    readonly id: number
    readonly bytes: Uint8Array
}

/** Play a sound kept, through some stages. */
export interface PlayRequest {
    readonly sound: number
    readonly volume: number
    readonly stages: readonly StageCall[]
}

/** The messages the main thread sends the worker, by the name of the port they are sent on. */
export interface WorkerRequests {
    readonly decode: DecodeRequest
    readonly play: PlayRequest
}

/** A sound decoded and kept by the worker. */
export interface Decoded {
    readonly id: number
    readonly sound: number
    readonly duration: number
}

/** A sound the worker could not decode. */
export interface DecodeFailed {
    readonly id: number
    readonly message: string
}

/** The messages the worker sends the main thread, by name. */
export interface WorkerReplies {
    readonly decoded: Decoded
    readonly decodeFailed: DecodeFailed
    readonly failed: { readonly message: string }
}

/** A message on the wire between the two threads: the name of what it carries, and what it carries. */
export type Wire<Messages> = {
    [Name in keyof Messages]: { readonly name: Name, readonly body: Messages[Name] }
}[keyof Messages]

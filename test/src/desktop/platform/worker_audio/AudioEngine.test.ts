import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, test } from "vitest"

import { decodeSound } from "../../../../../desktop/src/platform/audio/decodeSound"
import { AudioEngine } from "../../../../../desktop/src/platform/worker_audio/AudioEngine"
import type { StageCall } from "../../../../../desktop/src/platform/worker_audio/protocol"

const FRAMES = 512

let engine = new AudioEngine(1000)

/** A mono sound of constant samples, kept in the engine. */
function constant(level: number, frames = FRAMES, rate = 1000): number {
    return engine.addSound([new Float32Array(frames).fill(level)], rate)
}

/** Everything the engine renders until no voice sounds, as left and right samples. */
function renderAll(): { left: number[], right: number[] } {
    const left: number[] = []
    const right: number[] = []
    for(let round = 0; round < 2000 && engine.voices > 0; round++){
        const block = engine.render(FRAMES)
        for(let i = 0; i < FRAMES; i++){
            left.push(block[2 * i])
            right.push(block[2 * i + 1])
        }
    }
    return { left, right }
}

beforeEach(() => {
    engine = new AudioEngine(1000)
    renderAll()
})

describe("voices", () => {

    test("a sound played is heard on both sides then the voice ends", () => {
        engine.play(constant(0.5), 1, [])
        expect(engine.voices).toBe(1)
        const { left, right } = renderAll()
        expect(left[0]).toBeCloseTo(0.5)
        expect(right[0]).toBeCloseTo(0.5)
        expect(engine.voices).toBe(0)
    })

    test("a stereo sound keeps its two sides apart", () => {
        const sides = [new Float32Array(FRAMES).fill(0.25), new Float32Array(FRAMES).fill(0.5)]
        const sound = engine.addSound(sides, 1000)
        engine.play(sound, 1, [])
        const { left, right } = renderAll()
        expect(left[0]).toBeCloseTo(0.25)
        expect(right[0]).toBeCloseTo(0.5)
    })

    test("the volume scales the voice", () => {
        engine.play(constant(1), 0.25, [])
        expect(renderAll().left[0]).toBeCloseTo(0.25)
    })

    test("a sound at half the rate of the engine lasts twice as long", () => {
        engine.play(constant(0.5, FRAMES, 500), 1, [])
        engine.render(FRAMES)
        expect(engine.voices).toBe(1)
        engine.render(FRAMES)
        expect(engine.voices).toBe(0)
    })

    test("a voice past the pool cuts off the oldest", () => {
        const sound = constant(0.01, FRAMES * 10)
        for(let i = 0; i < 80; i++) engine.play(sound, 1, [])
        expect(engine.voices).toBe(64)
    })

    test("a sound that is unknown plays nothing", () => {
        engine.play(9999, 1, [])
        expect(engine.voices).toBe(0)
    })
})

describe("mixing", () => {

    test("voices add up", () => {
        engine.play(constant(0.1), 1, [])
        engine.play(constant(0.2), 1, [])
        expect(renderAll().left[0]).toBeCloseTo(0.3)
    })

    test("a sum above the knee is bent without leaving the range", () => {
        const levels = [0.7, 0.8, 0.9, 1.2, 3].map(level => {
            engine.play(constant(level), 1, [])
            return renderAll().left[0]
        })
        expect(levels[0]).toBeCloseTo(0.7)
        expect(levels[1]).toBeCloseTo(0.8)
        for(let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1])
        expect(levels[4]).toBeLessThanOrEqual(1)
    })
})

describe("stages", () => {

    const gain = (volume: number): StageCall => ({ method: "gain", args: [volume] })

    test("a gain multiplies the samples", () => {
        engine.play(constant(0.5), 1, [gain(0.5)])
        expect(renderAll().left[0]).toBeCloseTo(0.25)
    })

    test("a full pan to the right silences the left side", () => {
        engine.play(constant(0.3), 1, [{ method: "pan", args: [1] }])
        const { left, right } = renderAll()
        expect(left[0]).toBeCloseTo(0)
        expect(right[0]).toBeCloseTo(0.6)
    })

    test("a delay repeats the sound after its time and keeps the voice alive", () => {
        const impulse = new Float32Array(FRAMES)
        impulse[0] = 0.5
        engine.play(engine.addSound([impulse], 1000), 1, [{ method: "delay", args: [0.1, 0] }])
        const { left } = renderAll()
        expect(left[0]).toBeCloseTo(0.5)
        expect(left[100]).toBeCloseTo(0.5)
        expect(left[50]).toBeCloseTo(0)
    })

    test("a lowpass dulls a fast signal", () => {
        const rate = 48000
        engine = new AudioEngine(rate)
        const buzz = new Float32Array(FRAMES * 8).map((_, i) => i % 2 === 0 ? 0.5 : -0.5)
        engine.play(engine.addSound([buzz], rate), 1, [{ method: "biquad", args: [0, 500, 0.7, 0] }])
        const { left } = renderAll()
        expect(Math.max(...left.slice(2000, 3000).map(Math.abs))).toBeLessThan(0.05)
    })

    test("a reverb rings after the sound and a compressor calms a loud one", () => {
        engine.play(constant(0.5, 10), 1, [{ method: "reverb", args: [0.5, 1] }])
        const rung = renderAll().left
        expect(rung.length).toBeGreaterThan(400)
        expect(rung.every(Number.isFinite)).toBe(true)
        engine.play(constant(0.7), 1, [{ method: "compressor", args: [-24, 30, 12, 0.003, 0.25] }])
        expect(renderAll().left.at(-1)).toBeLessThan(0.7)
    })

    test("a distortion of 0 changes nothing", () => {
        engine.play(constant(0.4), 1, [{ method: "distortion", args: [0] }])
        expect(renderAll().left[0]).toBeCloseTo(0.4)
    })
})

describe("a sound of the game", () => {

    test("a decoded ogg file renders close to its source", async() => {
        const sound = await decodeSound(new Uint8Array(readFileSync("assets/mecard/sounds/guitare.ogg")))
        engine = new AudioEngine(sound.sampleRate)
        engine.play(engine.addSound(sound.channels, sound.sampleRate), 1, [])
        const { left } = renderAll()
        const source = sound.channels[0]
        let worst = 0
        for(let i = 0; i < source.length; i++) worst = Math.max(worst, Math.abs(left[i] - source[i]))
        expect(worst).toBeLessThan(0.01)
    })
})

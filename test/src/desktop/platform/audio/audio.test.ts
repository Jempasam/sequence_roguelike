import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

import { decodeSound } from "../../../../../desktop/src/platform/audio/decodeSound"
import { decodeWav } from "../../../../../desktop/src/platform/audio/decodeWav"
import { BLOCK, Mixer } from "../../../../../desktop/src/platform/audio/Mixer"
import { PcmSound } from "../../../../../desktop/src/platform/audio/PcmSound"
import { DelayStage, GainStage, PanStage } from "../../../../../desktop/src/platform/audio/stages"

/** The bytes of a 16 bits mono wav file holding these samples. */
function wavOf(samples: number[], rate: number): Uint8Array {
    const bytes = new Uint8Array(44 + samples.length * 2)
    const view = new DataView(bytes.buffer)
    const text = (at: number, value: string) => {
        for(let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i))
    }
    text(0, "RIFF")
    view.setUint32(4, 36 + samples.length * 2, true)
    text(8, "WAVE")
    text(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, rate, true)
    view.setUint32(28, rate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    text(36, "data")
    view.setUint32(40, samples.length * 2, true)
    samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(s * 32767), true))
    return bytes
}

describe("decoding", () => {

    test("a wav file gives its samples and rate", () => {
        const sound = decodeWav(wavOf([0, 0.5, -0.5], 8000))
        expect(sound.sampleRate).toBe(8000)
        expect(sound.channels).toHaveLength(1)
        expect([...sound.channels[0]].map(v => Math.round(v * 100) / 100)).toEqual([0, 0.5, -0.5])
    })

    test("bytes that are no sound file are refused", async() => {
        await expect(decodeSound(new Uint8Array([1, 2, 3, 4, 5]))).rejects.toThrow()
    })

    test("a shipped ogg file decodes to samples that are not silent", async() => {
        const bytes = readFileSync("assets/mecard/sounds/guitare.ogg")
        const sound = await decodeSound(new Uint8Array(bytes))
        expect(sound.duration).toBeGreaterThan(0)
        expect(sound.channels[0].some(v => Math.abs(v) > 0.001)).toBe(true)
    })
})

describe("mixing", () => {

    test("a voice is heard on both sides then ends", () => {
        const mixer = new Mixer(1000)
        mixer.add(new PcmSound([new Float32Array(BLOCK).fill(0.5)], 1000), [], 1)
        const block = mixer.render()
        expect(block[0]).toBeCloseTo(0.5)
        expect(block[1]).toBeCloseTo(0.5)
        expect(mixer.active).toBe(false)
    })

    test("two voices add up and the sum stays in range", () => {
        const mixer = new Mixer(1000)
        for(let i = 0; i < 3; i++) mixer.add(new PcmSound([new Float32Array(BLOCK).fill(0.6)], 1000), [], 1)
        const sample = mixer.render()[0]
        expect(sample).toBeLessThanOrEqual(1)
        expect(sample).toBeGreaterThan(0.95)
    })

    test("a sum above the knee is bent without a jump", () => {
        const levels = [0.7, 0.8, 0.9, 1.2, 2].map(level => {
            const mixer = new Mixer(1000)
            mixer.add(new PcmSound([new Float32Array(BLOCK).fill(level)], 1000), [], 1)
            return mixer.render()[0]
        })
        expect(levels.slice(0, 2)).toEqual([expect.closeTo(0.7), expect.closeTo(0.8)])
        for(let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1])
    })

    test("the volume scales a voice", () => {
        const mixer = new Mixer(1000)
        mixer.add(new PcmSound([new Float32Array(BLOCK).fill(1)], 1000), [], 0.25)
        expect(mixer.render()[0]).toBeCloseTo(0.25)
    })

    test("a sound at half the rate of the mixer lasts twice as long", () => {
        const mixer = new Mixer(2000)
        mixer.add(new PcmSound([new Float32Array(BLOCK).fill(0.5)], 1000), [], 1)
        mixer.render()
        expect(mixer.active).toBe(true)
        mixer.render()
        expect(mixer.active).toBe(false)
    })

    test("an echo keeps the voice alive after its sound", () => {
        const mixer = new Mixer(1000)
        mixer.add(new PcmSound([new Float32Array(10).fill(1)], 1000), [new DelayStage(0.1, 0.5, 1000)], 1)
        mixer.render()
        expect(mixer.active).toBe(true)
    })
})

describe("stages", () => {

    test("a gain multiplies the samples", () => {
        const left = new Float32Array([1, 1])
        const right = new Float32Array([0.5, 0.5])
        new GainStage(0.5).process(left, right, 2)
        expect([...left, ...right]).toEqual([0.5, 0.5, 0.25, 0.25])
    })

    test("a full pan to the right silences the left side", () => {
        const left = new Float32Array([1])
        const right = new Float32Array([1])
        new PanStage(1).process(left, right, 1)
        expect(left[0]).toBeCloseTo(0)
        expect(right[0]).toBeCloseTo(2)
    })

    test("a delay repeats the sound after its time", () => {
        const left = new Float32Array(6)
        const right = new Float32Array(6)
        left[0] = 1
        new DelayStage(3 / 1000, 0, 1000).process(left, right, 6)
        expect([...left]).toEqual([1, 0, 0, 1, 0, 0])
    })
})

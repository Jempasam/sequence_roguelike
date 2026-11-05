import { describe, expect, test } from "vitest"
import { MemoryAssets, MemoryStorage, startGame } from "@game/core"
import type { GfxPort, LoopPort, Platform } from "@game/core"

import { fakeGfx, fakeGl } from "../fixtures/fakeGl"
import { FakeInput } from "../fixtures/fakeInput"

// --- Fixture builders ---

/** A loop that runs a frame only when the test asks for one. */
class ManualLoop implements LoopPort {


    frame: ((dtMs: number) => void)|null = null

    start(frame: (dtMs: number) => void): void { this.frame = frame }

    stop(): void { this.frame = null }

    step(dtMs: number): void {
        if(!this.frame) throw new Error("ManualLoop not started. Call start() first.")
        this.frame(dtMs)
    }
}

/** A platform drawing on `surface`, with no assets, no saves and no input. */
function platform(surface: GfxPort, loop: LoopPort): Platform {
    return {
        gfx: surface, loop, input: new FakeInput(), clipboard: { read: async() => "", write: async() => {} },
        assets: new MemoryAssets(), storage: new MemoryStorage(),
    }
}

// --- Tests ---

describe("startGame", () => {
    test("one frame → the world and the interface drawn, then presented", () => {
        const fake = fakeGl()
        const surface = fakeGfx(fake.gl, 1280, 720)
        const loop = new ManualLoop()
        startGame(platform(surface, loop))
        loop.step(16)
        expect(fake.callsOf("drawElements").length).toBeGreaterThan(2)
        expect(surface.presented).toBe(1)
    })

    test("a frame where nothing changed → fewer draws than the first", () => {
        const fake = fakeGl()
        const loop = new ManualLoop()
        startGame(platform(fakeGfx(fake.gl, 1280, 720), loop))
        loop.step(16)
        const first = fake.callsOf("drawElements").length
        loop.step(16)
        expect(fake.callsOf("drawElements").length - first).toBeLessThan(first)
    })

    test("dispose → loop stopped", () => {
        const fake = fakeGl()
        const loop = new ManualLoop()
        startGame(platform(fakeGfx(fake.gl), loop)).dispose()
        expect(loop.frame).toBeNull()
    })
})

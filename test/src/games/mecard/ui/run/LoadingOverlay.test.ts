import { describe, expect, test } from "vitest"

import { LoadingOverlay } from "@game/core/mecard/loading-overlay"

import { uiSetup } from "../../../../fixtures/uiFixtures"

function overlay() {
    const setup = uiSetup({}, 620, 348)
    return new LoadingOverlay(setup.ui, setup.theme)
}

describe("LoadingOverlay", () => {
    test("shown then hidden → shown in between only", () => {
        const loading = overlay()
        expect(loading.shown).toBe(false)
        loading.show()
        expect(loading.shown).toBe(true)
        loading.hide()
        expect(loading.shown).toBe(false)
    })

    test("hidden with nothing shown → still hidden, and the next show still works", () => {
        const loading = overlay()
        loading.hide()
        loading.show()
        expect(loading.shown).toBe(true)
    })

    test("two shown at once → hidden only once both are over", () => {
        const loading = overlay()
        loading.show()
        loading.show()
        loading.hide()
        expect(loading.shown).toBe(true)
        loading.hide()
        expect(loading.shown).toBe(false)
    })

    test("during a promise → shown until it is done, whatever it gives", async () => {
        const loading = overlay()
        let done!: (value: number) => void
        const work = loading.during(new Promise<number>(resolve => { done = resolve }))
        expect(loading.shown).toBe(true)
        done(7)
        expect(await work).toBe(7)
        expect(loading.shown).toBe(false)
    })

    test("during a promise that fails → hidden, the failure kept", async () => {
        const loading = overlay()
        await expect(loading.during(Promise.reject(new Error("nope")))).rejects.toThrow("nope")
        expect(loading.shown).toBe(false)
    })
})

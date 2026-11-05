import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets } from "@game/core"
import { Run } from "@game/core/mecard"
import { LocalSync, TRAVEL_TOPIC, TravelBroadcaster } from "@game/core/mecard/sync"
import { MecardViewer } from "@game/core/mecard/viewer"

import { uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Pictures that never load, whatever is asked for. */
const NO_ASSETS = new Proxy({}, {
    get: () => (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
}) as unknown as Assets

/** A viewer on a channel, with nothing come yet. */
function watching() {
    const setup = uiSetup({}, 620, 348)
    const channel = new LocalSync()
    const toWorld = (x: number, y: number) => [x, y] as const
    const viewer = new MecardViewer(setup.theme, setup.ui, channel, NO_ASSETS, toWorld, toWorld)
    return { setup, channel, viewer }
}

// --- Tests ---

describe("MecardViewer", () => {
    test("nothing come yet → it stands, on an empty run", () => {
        const { setup, viewer } = watching()
        expect(viewer.run.travel.place).toBe(null)
        setup.ui.render()
        viewer.dispose()
    })

    test("a journey come → its run is the one shown, a move followed", () => {
        const { channel, viewer } = watching()
        const run = new Run(5)
        run.gold = 321
        new TravelBroadcaster(TRAVEL_TOPIC.sender(channel)).follow(run.travel)
        expect(viewer.run.gold).toBe(321)
        run.travel.jump(run.travel.next[0])
        expect(viewer.run.travel.place?.kind).toBe(run.travel.place?.kind)
        viewer.dispose()
    })
})

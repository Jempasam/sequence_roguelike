import { describe, expect, test } from "vitest"
import { savedRoute } from "@game/core/mecard"
import { routeStrip } from "@game/core/mecard/route-strip"
import { UnitSprites } from "@game/core/mecard/unit-sprites"

import { startedRun } from "../../../../fixtures/startedRun"
import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The route of a run whose party walked a few places. */
function walked(places: number) {
    const { travel } = startedRun(7)
    for(let step = 0; step < places; step++) travel.jump(travel.next[0])
    return savedRoute(travel)
}

// --- Tests ---

describe("savedRoute", () => {
    test("a party that walked → the rows it crossed tell their fight or halt, the others tell none", () => {
        const route = walked(3)
        const crossed = route.layers.filter(layer => layer.taken)
        expect(crossed.length).toBe(3)
        for(const layer of crossed) expect(layer.fight ?? layer.halt).toBeDefined()
        for(const layer of route.layers.filter(each => !each.taken)){
            expect(layer.fight).toBeUndefined()
            expect(layer.halt).toBeUndefined()
        }
        expect(route.fallAt).toBe(2)
    })
})

describe("routeStrip", () => {
    test("a crossed row → hovered, it tells its place", () => {
        const setup = uiSetup()
        const { view, details } = routeStrip(setup.theme, new UnitSprites(), walked(2))
        setup.main.content.add(view)
        setup.ui.render()
        expect(details.length).toBe(2)
        setup.port.send({ type: "pointer-move", x: 10, y: 10 })
        setup.frame()
        expect(details[0].shown).not.toBeNull()
    })

    test("a row not crossed → it tells nothing", () => {
        const route = walked(1)
        const { details } = routeStrip(uiSetup().theme, new UnitSprites(), route)
        expect(details.length).toBe(1)
    })
})

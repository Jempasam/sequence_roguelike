import { describe, expect, test } from "vitest"
import type { Painter } from "@game/core"
import { CosmosView, defaultLevels, Space, World } from "@game/core/cosmos"

// --- Fixture builders ---

/** A painter that only counts what it is asked to draw. */
function countingPainter(): { painter: Painter, count: () => number } {
    let drawn = 0
    const painter = {
        setTint: () => {},
        rect: () => { drawn++ },
        circle: () => { drawn++ },
    } as unknown as Painter
    return { painter, count: () => drawn }
}

// --- Tests ---

describe("CosmosView", () => {
    test("zoom from the galaxies to a person's spot → every level draws something without failing", () => {
        const space = new Space(new World(4, defaultLevels()).registry.get("universe"))
        const view = new CosmosView()
        const { painter, count } = countingPainter()
        const seen = new Set<string>()
        let time = 0
        for(let step = 0; step < 700 && space.current.level.name !== "human"; step++){
            space.zoom(0.85)
            time += 0.05
            space.update(time)
            seen.add(space.current.level.name)
            const before = count()
            view.draw(painter, space, [space.anchorHere()], time)
            expect(count()).toBeGreaterThan(before)
        }
        expect(seen).toContain("planet")
        expect(seen).toContain("human")
    })
})

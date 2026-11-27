import { describe, expect, test } from "vitest"
import { defaultLevels } from "@game/core-src/games/cosmos/level/defaultLevels"
import { World } from "@game/core-src/games/cosmos/level/World"
import { Space } from "@game/core-src/games/cosmos/space/Space"
import { panelModel } from "@game/core-src/games/cosmos/ui/LevelPanelModel"

// --- Fixture builders ---

function spaceOf(seed = 1): Space {
    return new Space(new World(seed, defaultLevels()).registry.get("universe"))
}

function zoomIn(space: Space, steps: number): void {
    for(let i = 0; i < steps; i++){
        space.zoom(0.8)
        space.update(0)
    }
}

// --- Tests ---

describe("panelModel", () => {
    test("the whole only → one row, the current one", () => {
        const model = panelModel(spaceOf())
        expect(model.rows).toHaveLength(1)
        expect(model.rows[0].current).toBe(true)
    })

    test("a deeper space → one row per level crossed, the last one current", () => {
        const space = spaceOf()
        zoomIn(space, 120)
        const model = panelModel(space)
        expect(model.rows).toHaveLength(space.chain.length)
        const last = model.rows.length - 1
        expect(model.rows.map(row => row.current)).toEqual(model.rows.map((_, i) => i === last))
        expect(model.rows[0].label).toBe("Univers")
    })

    test("the view narrows → the zoom grows", () => {
        const space = spaceOf()
        const before = panelModel(space).zoom
        zoomIn(space, 30)
        expect(panelModel(space).zoom).toBeGreaterThan(before)
    })

    test("each level crossed → starts at a higher zoom than the one above", () => {
        const space = spaceOf()
        zoomIn(space, 150)
        const zooms = panelModel(space).rows.map(row => row.zoom)
        for(let i = 1; i < zooms.length; i++) expect(zooms[i]).toBeGreaterThan(zooms[i - 1])
    })
})

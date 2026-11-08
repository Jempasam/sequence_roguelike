import { describe, expect, test } from "vitest"
import { visual } from "@game/core/mecard"
import { Heart, placeHazard, RED_HEART, SOLID_HEART, TIME_HEART, Vector2 } from "@game/core/mecard"
import { ArenaHearts } from "@game/core/mecard/arena-hearts"
import { BattleScene } from "@game/core/mecard/battle-ui"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { battle, MONSTERS, unit, withPillars } from "../../sim/fixtures"

// --- Fixture builders ---

/** The rows built over a battle: one block of the layer for each unit that shows hearts. */
function rowsOver(prepare: (on: ReturnType<typeof battle>) => void): number {
    const setup = uiSetup()
    const on = battle()
    prepare(on)
    const scene = new BattleScene()
    for(const each of on.units) scene.add(each)
    const layer = setup.ui.addLayer("hearts")
    const sprites = { icon: () => null } as unknown as ConstructorParameters<typeof ArenaHearts>[2]
    new ArenaHearts(setup.theme, layer, sprites, () => {}, () => {}).rebuild(scene)
    return layer.content.children.length
}

// --- Tests ---

describe("ArenaHearts.rebuild", () => {
    test("a hero and a foe → a row of hearts for each", () => {
        expect(rowsOver(on => {
            unit(on, 1, 5)
            unit(on, 6, 1, { team: MONSTERS })
        })).toBe(2)
    })

    test("a pillar, solid hearts only → no row", () => {
        expect(rowsOver(on => {
            unit(on, 1, 5)
            withPillars(on, { center: new Vector2(3.5, 3), radius: 0.5 })
        })).toBe(1)
    })

    test("a body counting its rounds with a time heart → a row", () => {
        expect(rowsOver(on => {
            const hero = unit(on, 1, 5)
            placeHazard(on, hero, {
                sprite: visual("units/fire"), name: "Flammes", zone: { kind: "circle", center: new Vector2(3, 3), radius: 1 },
                hearts: [new Heart(TIME_HEART)],
            })
        })).toBe(2)
    })

    test("solid and red hearts together → a row", () => {
        expect(rowsOver(on => {
            const hero = unit(on, 1, 5)
            on.place(hero, {
                sprite: visual("units/stone"), name: "Mur", at: new Vector2(3, 3),
                hearts: [new Heart(SOLID_HEART), new Heart(RED_HEART)],
            })
        })).toBe(2)
    })
})

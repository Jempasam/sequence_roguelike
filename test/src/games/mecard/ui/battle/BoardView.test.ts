import { describe, expect, test } from "vitest"
import { Heart, placeHazard, RED_HEART, TIME_HEART, Vector2 } from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"
import { BattleScene, BoardView, drawOrder } from "@game/core/mecard/battle-ui"
import type { SceneUnit } from "@game/core/mecard/battle-ui"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { battle, MONSTERS, unit, withPillars } from "../../sim/fixtures"

// --- Fixture builders ---

/** Units with no pictures. */
const NO_SPRITES = { of: () => null, shade: null, rope: null } as unknown as ConstructorParameters<typeof BoardView>[3]

/** The room the arena is fitted in, in pixels of the world: a meter takes 9 of them, from (4, 7). */
const ROOM = { left: 0, top: 0, right: 70, bottom: 70 }

/** A board over a battle, fitted so that a point of the arena is at `pixel`. */
function boardOn(on: Battle): { board: BoardView, pixel: (x: number, y: number) => readonly [number, number] } {
    const { theme } = uiSetup()
    const scene = new BattleScene()
    for(const each of on.units) scene.add(each)
    const board = new BoardView(theme.font, theme.white, scene, NO_SPRITES)
    board.fit(on, ROOM)
    return { board, pixel: (x, y) => [4 + x * 9, 7 + y * 9] }
}

// --- Tests ---

describe("drawOrder", () => {
    /** The units of a battle as its scene shows them, in the order they entered. */
    function shownOf(on: Battle): SceneUnit[] {
        const scene = new BattleScene()
        for(const each of on.units) scene.add(each)
        return scene.living
    }

    test("the lower on the arena, the later drawn, whatever the order of entry", () => {
        const on = battle()
        const low = unit(on, 3, 5)
        const high = unit(on, 3, 2, { team: MONSTERS })
        expect(drawOrder(shownOf(on)).map(shown => shown.unit)).toEqual([high, low])
    })

    test("a pillar drawn by its height among the others", () => {
        const on = withPillars(battle(), { center: new Vector2(3.5, 3), radius: 0.5 })
        const near = unit(on, 3, 5)
        const far = unit(on, 3, 1, { team: MONSTERS })
        const pillar = on.units.find(each => each.sprite === "pillar") as Unit
        expect(drawOrder(shownOf(on)).map(shown => shown.unit)).toEqual([far, pillar, near])
    })

    test("a body that takes no room → drawn under the units standing, even lower than them", () => {
        const on = battle()
        const hero = unit(on, 3, 2)
        const wind = on.place(hero, {
            sprite: "tornado", name: "Tourbillon", at: new Vector2(3, 6), hearts: [new Heart(TIME_HEART)],
            tangible: false,
        }) as Unit
        expect(drawOrder(shownOf(on)).map(shown => shown.unit)).toEqual([wind, hero])
    })

    test("a body covering a zone → left to the ground, drawn before", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        placeHazard(on, hero, {
            sprite: "fire", name: "Flammes", zone: { kind: "circle", center: new Vector2(3, 3), radius: 1 },
            hearts: [new Heart(TIME_HEART)],
        })
        expect(drawOrder(shownOf(on)).map(shown => shown.unit)).toEqual([hero])
    })
})

describe("BoardView.unitAt", () => {
    test("a hero, a foe and a pillar → each found under its own point", () => {
        const on = withPillars(battle(), { center: new Vector2(3.5, 3), radius: 0.5 })
        const hero = unit(on, 1, 5)
        const foe = unit(on, 6, 1, { team: MONSTERS })
        const pillar = on.units.find(each => each.sprite === "pillar") as Unit
        const { board, pixel } = boardOn(on)
        expect(board.unitAt(...pixel(1, 5))).toBe(hero)
        expect(board.unitAt(...pixel(6, 1))).toBe(foe)
        expect(board.unitAt(...pixel(3.5, 3))).toBe(pillar)
    })

    test("nothing there → none", () => {
        const on = battle()
        unit(on, 1, 5)
        const { board, pixel } = boardOn(on)
        expect(board.unitAt(...pixel(5, 3))).toBeNull()
    })

    test("a body that takes no room → found too, and a unit over it is not hidden", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        const zone = placeHazard(on, hero, {
            sprite: "fire", name: "Flammes", zone: { kind: "circle", center: new Vector2(3, 3), radius: 1.2 },
            hearts: [new Heart(TIME_HEART)],
        }) as Unit
        const { board, pixel } = boardOn(on)
        expect(board.unitAt(...pixel(3, 3))).toBe(hero)
        expect(board.unitAt(...pixel(3.9, 3))).toBe(zone)
    })

    test("a clone → found as any unit", () => {
        const on = battle()
        const maker = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        const clone = on.clone(maker, [new Heart(RED_HEART)]) as Unit
        const { board, pixel } = boardOn(on)
        expect(board.unitAt(...pixel(clone.position.x, clone.position.y))).toBe(clone)
    })
})

import { describe, expect, test } from "vitest"
import { ALL_KITS, heroOf } from "@game/core/mecard"
import { AbsItemIcon } from "@game/core/mecard/abs-item-icon"
import { stuffRow } from "@game/core/mecard/stuff-row"
import type { Hero } from "@game/core/mecard"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Units and objects with no pictures. */
const NO_SPRITES = { of: () => null, thing: () => null } as unknown as Parameters<typeof stuffRow>[1]

/** The row of a hero, with its items and its usables given, and how many cards it has when asked. */
function rowOf(hero: Hero, count = true): NonNullable<ReturnType<typeof stuffRow>> {
    return stuffRow(uiSetup().theme, NO_SPRITES, hero, count)!
}

/** How many icons and bars a row holds. */
function partsOf(row: ReturnType<typeof rowOf>): { icons: AbsItemIcon[], bars: number } {
    const icons = row.children.filter((child): child is AbsItemIcon => child instanceof AbsItemIcon)
    return { icons, bars: row.children.filter(child => child.constructor.name === "Bar").length }
}

// --- Tests ---

describe("stuffRow", () => {
    test("hero with items and no usables → its item icons after one bar", () => {
        const hero = { ...heroOf(ALL_KITS[0]), usables: [] }
        const { icons, bars } = partsOf(rowOf(hero))
        expect(icons).toHaveLength(hero.items.length)
        expect(bars).toBe(hero.items.length > 0 ? 1 : 0)
    })

    test("hero with neither items nor usables → no bar, no icon", () => {
        const hero = { ...heroOf(ALL_KITS[0]), items: [], usables: [] }
        const { icons, bars } = partsOf(rowOf(hero))
        expect(icons).toHaveLength(0)
        expect(bars).toBe(0)
    })

    test("hero with items and usables → one bar before each group, every icon tells something", () => {
        const base = heroOf(ALL_KITS.find(kit => kit.items.length > 0 && kit.usables.length > 0)!)
        const { icons, bars } = partsOf(rowOf(base))
        expect(bars).toBe(2)
        expect(icons.length).toBeGreaterThan(0)
        for(const icon of icons) expect(icon.detail).not.toBeNull()
    })

    test("no count asked, items and usables → no bar before the first group", () => {
        const base = heroOf(ALL_KITS.find(kit => kit.items.length > 0 && kit.usables.length > 0)!)
        expect(partsOf(rowOf(base, false)).bars).toBe(1)
    })

    test("no count asked, neither items nor usables → no row at all", () => {
        const hero = { ...heroOf(ALL_KITS[0]), items: [], usables: [] }
        expect(stuffRow(uiSetup().theme, NO_SPRITES, hero, false)).toBeNull()
    })
})

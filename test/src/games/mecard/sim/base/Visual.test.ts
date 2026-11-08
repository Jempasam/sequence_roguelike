import { existsSync } from "node:fs"
import { describe, expect, test } from "vitest"
import {
    allPlaceTypes, BOSS_MONSTERS, BURNING_GROUND, BURNING_GROUNDS, FIRE_ELEMENT, GRAND_RITUAL, GRAND_RITUALS, ALL_FIGHTS, ALL_FLOORS, Grievance, Haste, ALL_ITEMS, ALL_KITS, loadedVisual, ALL_MONSTERS, ALL_PETS,
    PNJ_HATS, PNJ_ITEMS, PNJ_MASKS, Riding, savedVisual, ShadowLink, STATUS_FAMILIES, STATUS_TYPES, Strength,
    ALL_USABLES, Vanishing, Visual,
} from "@game/core/mecard"
import { ICON_KEYS, SPRITE_KEYS } from "@game/core/mecard/unit-sprites"

// --- Fixture builders ---

/** Do the pictures of a visual exist, as a file shipped with the game? */
function missingFiles(visuals: readonly Visual[]): string[] {
    return [...new Set(visuals.map(each => each.visual))].filter(key => !existsSync(`assets/mecard/${key}.png`))
}

// --- Tests ---

describe("Visual", () => {

    test("a visual says from its key what it does not say", () => {
        const fire = new Visual({ visual: "units/fire" })
        expect(fire.letter).toBe("Fi")
        expect(fire.description).toBe("fire")
        expect(fire.coloration).toBeNull()
    })

    test("with changes what it is told, and leaves the original alone", () => {
        const fire = new Visual({ visual: "units/fire", color: [1, 0.5, 0] })
        const blue = fire.with({ coloration: [0, 0, 1] })
        expect(blue.coloration).toEqual([0, 0, 1])
        expect(blue.color).toEqual([1, 0.5, 0])
        expect(fire.coloration).toBeNull()
    })

    test("a saved visual is read back as it was", () => {
        const visual = new Visual({ visual: "statuses/burn", letter: "Br", color: [1, 0.5, 0.2] })
        expect(loadedVisual(savedVisual(visual))).toEqual(visual)
        expect(loadedVisual(savedVisual(null))).toBeNull()
    })

    test("an old save naming a sprite alone is read as the picture of that unit", () => {
        expect(loadedVisual("lancer")?.visual).toBe("units/lancer")
    })
})

describe("the pictures the catalog names", () => {

    test("items, usables and statuses → a file of the game each", () => {
        const visuals = [
            ...ALL_ITEMS.map(each => each.icon),
            ...ALL_USABLES.map(each => each.icon),
            ...[...STATUS_TYPES, ...STATUS_FAMILIES].map(each => each.visual),
        ]
        expect(missingFiles(visuals)).toEqual([])
    })

    test("halts and floors, their decorations and the hats of the characters → a file of the game each", () => {
        const fights = new Set(ALL_FIGHTS.map(each => each.icon))
        const places = allPlaceTypes().map(each => each.icon).filter(each => !fights.has(each))
        const floors = ALL_FLOORS.flatMap(each => [each.icon, ...each.decorations.map(piece => piece.picture)])
        const hats = [PNJ_HATS, PNJ_MASKS, PNJ_ITEMS].flatMap(group => Object.values(group).map(each => each.path))
        expect(missingFiles([...places, ...floors, ...hats])).toEqual([])
    })

    test("monsters, bosses, kits and pets → a file of the game each, which the screens load", () => {
        const named = [...ALL_MONSTERS, ...BOSS_MONSTERS, ...ALL_KITS, ...ALL_PETS].map(each => each.sprite)
        expect(missingFiles(named)).toEqual([])
        const loaded = new Set(SPRITE_KEYS)
        expect(named.map(each => each.visual).filter(key => !loaded.has(key))).toEqual([])
    })

    test("processes with an icon → a file of the game each, which the screens load", () => {
        const named = [new Strength(1), new Haste(1.5), new Riding(2), new ShadowLink(), new Vanishing()]
            .flatMap(each => each.icon ? [each.icon] : [])
        expect(missingFiles(named)).toEqual([])
        const loaded = new Set(ICON_KEYS)
        expect(named.map(each => each.visual).filter(key => !loaded.has(key))).toEqual([])
    })

    test("a process may have no icon → its name and color alone", () => {
        expect(new Grievance().icon).toBeNull()
    })

    test("the fights → no file, and the letter the map writes in its stead", () => {
        expect(ALL_FIGHTS.map(each => each.icon.letter)).toEqual(["C", "É", "B"])
        expect(missingFiles(ALL_FIGHTS.map(each => each.icon))).toHaveLength(ALL_FIGHTS.length)
    })

    test("a variant of a status → the visual of its family", () => {
        expect(GRAND_RITUALS.of(FIRE_ELEMENT).visual).toBe(GRAND_RITUAL.visual)
        expect(BURNING_GROUNDS.of(FIRE_ELEMENT).visual).toBe(BURNING_GROUND.visual)
        expect(BURNING_GROUNDS.of(FIRE_ELEMENT).color).toEqual(BURNING_GROUND.color)
    })
})

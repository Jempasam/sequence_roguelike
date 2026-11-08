import { describe, expect, test } from "vitest"
import { plainText } from "@game/core"
import {
    ALL_CARDS, BOMB, FLAMETHROWER, GLASS_HEART, ALL_ITEMS, ALL_MONSTERS, PUSH, RED_HEART, SHIELD_HEART, SHOT, SLASH,
    SPELL, SWEEP, TASER, THORN_HEART, THRUST,
} from "@game/core/mecard"

// --- Fixture builders ---

/** Every value of the catalog that tells itself, with a description when it has one. */
const TOLD = [...ALL_CARDS, ...ALL_ITEMS, RED_HEART, SHIELD_HEART, THORN_HEART, GLASS_HEART]

/** Does a plain text hold an object that told nothing, or a part that was missing? */
function isBroken(text: string): boolean {
    return text.includes("[object") || text.includes("undefined")
}

// --- Tests ---

describe("catalog texts", () => {
    test("every name and description → told whole", () => {
        for(const value of TOLD){
            expect(isBroken(plainText(value)), value.name).toBe(false)
            expect(isBroken(plainText(value.description)), value.name).toBe(false)
        }
        for(const monster of ALL_MONSTERS) expect(plainText(monster)).toBe(monster.name)
    })

    test("each weapon → its base damage", () => {
        for(const weapon of [SHOT, SLASH, THRUST, SWEEP, BOMB, FLAMETHROWER, TASER, PUSH, SPELL]){
            expect(plainText(weapon.description), weapon.name).toMatch(/\d+ dégâts?/)
        }
    })

    test("a blow → its bonus on top", () => {
        expect(plainText(SLASH.description)).toContain("2 dégâts + force")
    })
})

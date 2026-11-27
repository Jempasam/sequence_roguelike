import { describe, expect, test } from "vitest"
import { FORCE, HEART } from "@game/core-src/games/mecard/sim/base/keywords"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import * as Family from "@game/core-src/games/mecard/sim/battle/mecanic/family"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { BLAZE } from "@game/core-src/games/mecard/sim/card/subs/body/BodyCards"
import { CHARGE } from "@game/core-src/games/mecard/sim/card/subs/composite/MergedCard"
import { BLOOD_AXE } from "@game/core-src/games/mecard/sim/card/subs/attack/BloodAxe"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { BURN } from "@game/core-src/games/mecard/sim/status/subs/Burn"
import { plainText } from "@game/core-src/semantic"

// --- Tests ---

describe("family", () => {
    test("a merge → it is of the families of its cards", () => {
        expect(Family.isOfFamily(CHARGE, DamageType.PHYSICAL, FORCE)).toBe(true)
        expect(Family.isOfFamily(STEP, DamageType.PHYSICAL)).toBe(false)
    })

    test("a keyword one of the marks asks for is missing → not of the family", () => {
        expect(Family.isOfFamily(SLASH, DamageType.PHYSICAL, DamageType.ELEMENTAL)).toBe(false)
    })

    test("a count of hearts in a description → the card names the heart", () => {
        expect(Family.isOfFamily(BLOOD_AXE, HEART)).toBe(true)
    })

    test("a status of a level in a description → the card names its kind", () => {
        expect(Family.isOfFamily(BLAZE, BURN)).toBe(true)
    })

    test("cards among others → those of the family, in order", () => {
        expect(Family.ofFamily([STEP, SLASH, CHARGE], DamageType.PHYSICAL)).toEqual([SLASH, CHARGE])
    })

    test("a family in a text → its keyword, then its marks", () => {
        expect(plainText(Family.familyText(DamageType.PHYSICAL, FORCE))).toBe("de famille dégâts physiques, force")
    })
})

describe("kinship", () => {
    test("a card with itself → it shares every one of its keywords", () => {
        expect(Family.sharedMarks(SLASH, SLASH)).toBe(Family.marksOf(SLASH).size)
    })

    test("a kinship asked beyond what two cards share → not akin", () => {
        const shared = Family.sharedMarks(SLASH, STEP)
        expect(Family.isKin(SLASH, STEP, shared)).toBe(true)
        expect(Family.isKin(SLASH, STEP, shared + 1)).toBe(false)
    })

    test("cards among others → those akin to the reference", () => {
        const wanted = Family.marksOf(SLASH).size
        expect(Family.kinOf([STEP, SLASH], SLASH, wanted)).toEqual([SLASH])
    })

    test("a kinship in a text → its keyword, then its number", () => {
        expect(plainText(Family.kinText(2))).toBe("de parenté 2")
    })
})

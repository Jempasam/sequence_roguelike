import { describe, expect, test } from "vitest"
import {
    ACTION_FAMILY, AURA, ECHO, ELEMENT_FAMILY, FIRE, FUSION_FAMILY, FusionCard, IMPROVISED_ROBOT,
    LAUNCHER_FAMILY, MERGED_FAMILY, MergedCard, MISSILE, MODIFIER_FAMILY, MODULE_FAMILY, NAMED_FUSION_FAMILY,
    POISON, POTION_FAMILY, PREP_FAMILY, RANDOM_FAMILY, RandomCard, REACTION, REPEAT_2, SPELL, STEP,
    THROWN_POTION, THRUST, TORNADO, UNSTABLE_THRUST, WATER,
} from "@game/core/mecard"

// --- Tests ---

describe("a card's family", () => {
    test("a plain action → an action", () => {
        expect(THRUST.family).toBe(ACTION_FAMILY)
    })

    test("a card changing actions → a modifier", () => {
        expect(REPEAT_2.family).toBe(MODIFIER_FAMILY)
        expect(TORNADO.family).toBe(MODIFIER_FAMILY)
    })

    test("a card making actions from anything else → a launcher", () => {
        for(const card of [SPELL, AURA, IMPROVISED_ROBOT, THROWN_POTION]){
            expect(card.family).toBe(LAUNCHER_FAMILY)
        }
    })

    test("each card by what it gives", () => {
        expect(FIRE.family).toBe(ELEMENT_FAMILY)
        expect(ECHO.family).toBe(ELEMENT_FAMILY)
        expect(POISON.family).toBe(POTION_FAMILY)
        expect(MISSILE.family).toBe(MODULE_FAMILY)
        expect(REACTION.family).toBe(PREP_FAMILY)
    })

    test("a card holding cards → its own, before what it gives", () => {
        expect(new FusionCard([STEP, THRUST]).family).toBe(FUSION_FAMILY)
        expect(UNSTABLE_THRUST.family).toBe(NAMED_FUSION_FAMILY)
        expect(new MergedCard(STEP, THRUST).family).toBe(MERGED_FAMILY)
        expect(new RandomCard(FIRE, WATER).family).toBe(RANDOM_FAMILY)
    })
})

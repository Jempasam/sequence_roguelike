import { describe, expect, test } from "vitest"
import { FIRE, FusionCard, MergedCard, RandomCard, STEP, THRUST, WATER } from "@game/core/mecard"
import { joinGlyph } from "@game/core/mecard/joinGlyph"

// --- Tests ---

describe("the glyph over the limit between held cards", () => {
    test("each way of holding cards has its own", () => {
        const glyphs = [
            joinGlyph(new FusionCard([STEP, THRUST])),
            joinGlyph(new MergedCard(STEP, THRUST)),
            joinGlyph(new RandomCard(FIRE, WATER)),
        ]
        expect(new Set(glyphs).size).toBe(3)
        expect(glyphs).not.toContain("")
    })

    test("a card holding none → none", () => {
        expect(joinGlyph(THRUST)).toBe("")
    })
})

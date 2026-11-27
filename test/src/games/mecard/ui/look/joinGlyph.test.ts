import { describe, expect, test } from "vitest"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { FusionCard } from "@game/core-src/games/mecard/sim/card/subs/composite/FusionCard"
import { MergedCard } from "@game/core-src/games/mecard/sim/card/subs/composite/MergedCard"
import { RandomCard } from "@game/core-src/games/mecard/sim/card/subs/composite/RandomCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { FIRE, WATER } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { joinGlyph } from "@game/core/mecard/joinGlyph"

// --- Tests ---

describe("the glyph over the limit between held cards", () => {
    test("each way of holding cards has its own", () => {
        const glyphs = [
            joinGlyph(new FusionCard([STEP, THRUST])),
            joinGlyph(new MergedCard([STEP, THRUST])),
            joinGlyph(new RandomCard(FIRE, WATER)),
        ]
        expect(new Set(glyphs).size).toBe(3)
        expect(glyphs).not.toContain("")
    })

    test("a card holding none → none", () => {
        expect(joinGlyph(THRUST)).toBe("")
    })
})

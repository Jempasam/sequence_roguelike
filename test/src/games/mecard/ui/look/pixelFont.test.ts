import { describe, expect, test } from "vitest"
import { spansOf } from "@game/core"
import type { Text } from "@game/core"
import {
    CARDS, FIRE, allHalts, ITEMS, MergedCard, RandomCard, Run, STEP, THRUST, USABLES, WATER,
} from "@game/core/mecard"
import { pixelFont } from "@game/core/mecard/pixel-font"
import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The characters of a text the font would draw with its fallback: those of its pictures are not drawn. */
function missing(text: Text): string[] {
    const { font } = pixelFont(uiSetup().gpu)
    const written = spansOf(text).flatMap(span => span.kind === "string" ? [...span.text] : [])
    return written.filter(character => character !== "\n" && !font.has(character))
}

// --- Tests ---

describe("pixelFont", () => {
    test("two cards tied → their name fully drawn", () => {
        expect(missing(new MergedCard(STEP, THRUST).name)).toEqual([])
        expect(missing(new RandomCard(FIRE, WATER).name)).toEqual([])
    })

    test("every card, item and usable → its name and what it does fully drawn", () => {
        for(const thing of [...CARDS, ...ITEMS, ...USABLES]){
            expect(missing([thing.name, thing.description]), thing.name).toEqual([])
        }
    })

    test("every halt → its name, what it does and its line fully drawn", () => {
        for(const type of allHalts()){
            const halt = type.create(new Run(1))
            expect(missing([type.name, type.description, halt.line]), type.name).toEqual([])
        }
    })
})

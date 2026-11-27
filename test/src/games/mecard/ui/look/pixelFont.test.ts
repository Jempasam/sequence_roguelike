import { describe, expect, test } from "vitest"
import { spansOf } from "@game/core-src/semantic/Text"
import type { Text } from "@game/core-src/semantic/Text"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { MergedCard } from "@game/core-src/games/mecard/sim/card/subs/composite/MergedCard"
import { RandomCard } from "@game/core-src/games/mecard/sim/card/subs/composite/RandomCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { FIRE, WATER } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { allHalts } from "@game/core-src/games/mecard/sim/catalog/halts"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_USABLES } from "@game/core-src/games/mecard/sim/catalog/usables"
import { pixelFont } from "@game/core/mecard/pixel-font"
import { uiSetup } from "../../../../fixtures/uiFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

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
        expect(missing(new MergedCard([STEP, THRUST]).name)).toEqual([])
        expect(missing(new RandomCard(FIRE, WATER).name)).toEqual([])
    })

    test("every card, item and usable → its name and what it does fully drawn", () => {
        for(const thing of [...ALL_CARDS, ...ALL_ITEMS, ...ALL_USABLES]){
            expect(missing([thing.name, thing.description]), thing.name).toEqual([])
        }
    })

    test("every halt → its name, what it does and its line fully drawn", () => {
        for(const type of allHalts()){
            const halt = type.create(startedRun(1))
            expect(missing([type.name, type.description, halt.line]), type.name).toEqual([])
        }
    })
})

import { describe, expect, test } from "vitest"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { darkHalts, allHalts, rewardHalts } from "@game/core-src/games/mecard/sim/catalog/halts"
import { PNJ_HATS } from "@game/core-src/games/mecard/sim/halt/PnjHats"
import { DEFAULT_CUES, scenePnj } from "@game/core-src/games/mecard/sim/halt/SceneLook"
import { EXIT_HALT } from "@game/core-src/games/mecard/sim/halt/subs/ExitHalt"
import { CHEST_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/ChestHalt"
import { SHOP_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/ShopHalt"
import { DARK_COLOR, DARK_MASK } from "@game/core-src/games/mecard/sim/halt/subs/halt_common"
import type { HaltMoment, PnjCue } from "@game/core-src/games/mecard/sim/halt/SceneLook"
import { PNJ_ANIMATIONS } from "@game/core-src/games/mecard/ui/pnj/PnjAnimation"
import { CUE_ANIMATIONS } from "@game/core/mecard/travel-looks"
import { startedRun } from "../../../../fixtures/startedRun"

/** Every moment a character of a halt reacts to. */
const MOMENTS: readonly HaltMoment[] = ["arrive", "pick", "done", "refuse"]

/** How each kind of halt looks. */
const LOOKS = allHalts().map(type => [type.id, type.create(startedRun(1)).look] as const)

describe("the character of a scene", () => {
    test("drawn from its painting unless it says a unit", () => {
        const ninja = visual("units/ninja")
        expect(scenePnj({}).unit).toBeNull()
        expect(scenePnj({ unit: ninja }).unit).toBe(ninja)
    })
})

describe("the looks of the places", () => {
    test("nobody stands on the map, nor at a chest or an exit", () => {
        for(const type of ALL_FLOORS) expect(type.look.pnj).toBeUndefined()
        expect(CHEST_HALT.create(startedRun(1)).look.pnj).toBeUndefined()
        expect(EXIT_HALT.create(startedRun(1)).look.pnj).toBeUndefined()
        for(const type of rewardHalts()) expect(type.create(startedRun(1)).look.pnj, type.id).toBeUndefined()
    })

    test("every other halt has a character, wearing a hat, playing something at every moment", () => {
        for(const [place, look] of LOOKS){
            if(place === "chest" || place === "exit" || rewardHalts().some(type => type.id === place)) continue
            const pnj = look.pnj
            expect(pnj, place).toBeDefined()
            if(pnj?.unit) expect(pnj.hat, place).toBeNull()
            else expect(pnj?.hat, place).not.toBeNull()
            if(pnj?.hat) expect(PNJ_HATS[pnj.hat], place).toBeDefined()
            for(const moment of MOMENTS) expect(pnj?.cues[moment], `${place} at ${moment}`).toBeDefined()
        }
    })

    test("the dark ones wear the violet skeleton mask, and glow violet", () => {
        for(const type of darkHalts()){
            const pnj = type.create(startedRun(1)).look.pnj
            expect(type.glow, type.id).toEqual(DARK_COLOR)
            if(pnj?.unit){
                expect(pnj.mask, type.id).toBeNull()
                continue
            }
            expect(pnj?.mask, type.id).toBe(DARK_MASK)
            expect(pnj?.maskColor, type.id).toEqual(DARK_COLOR)
        }
    })

    test("a halt saying nothing of a moment plays the default", () => {
        expect(SHOP_HALT.create(startedRun(1)).look.pnj?.cues).toEqual(DEFAULT_CUES)
    })
})

describe("CUE_ANIMATIONS", () => {
    test("every move a halt names is an animation of the characters", () => {
        for(const cue of Object.keys(CUE_ANIMATIONS) as PnjCue[]){
            expect(PNJ_ANIMATIONS, cue).toContain(CUE_ANIMATIONS[cue])
        }
    })
})

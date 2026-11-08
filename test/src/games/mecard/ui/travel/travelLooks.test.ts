import { describe, expect, test } from "vitest"
import { DARK_COLOR, DARK_MASK, darkHalts, DEFAULT_CUES, allHalts, CHEST_HALT, EXIT_HALT, ALL_FLOORS, PNJ_HATS, SHOP_HALT, Run } from "@game/core/mecard"
import type { HaltMoment, PnjCue } from "@game/core/mecard"
import { PNJ_ANIMATIONS } from "@game/core/mecard/pnj"
import { CUE_ANIMATIONS } from "@game/core/mecard/travel-looks"

/** Every moment a character of a halt reacts to. */
const MOMENTS: readonly HaltMoment[] = ["arrive", "pick", "done", "refuse"]

/** How each kind of halt looks. */
const LOOKS = allHalts().map(type => [type.id, type.create(new Run(1)).look] as const)

describe("the looks of the places", () => {
    test("nobody stands on the map, nor at a chest or an exit", () => {
        for(const type of ALL_FLOORS) expect(type.look.pnj).toBeUndefined()
        expect(CHEST_HALT.create(new Run(1)).look.pnj).toBeUndefined()
        expect(EXIT_HALT.create(new Run(1)).look.pnj).toBeUndefined()
    })

    test("every other halt has a character, wearing a hat, playing something at every moment", () => {
        for(const [place, look] of LOOKS){
            if(place === "chest" || place === "exit") continue
            const pnj = look.pnj
            expect(pnj, place).toBeDefined()
            expect(pnj?.hat, place).not.toBeNull()
            if(pnj?.hat) expect(PNJ_HATS[pnj.hat], place).toBeDefined()
            for(const moment of MOMENTS) expect(pnj?.cues[moment], `${place} at ${moment}`).toBeDefined()
        }
    })

    test("the dark ones wear the violet skeleton mask, and glow violet", () => {
        for(const type of darkHalts()){
            const pnj = type.create(new Run(1)).look.pnj
            expect(pnj?.mask, type.id).toBe(DARK_MASK)
            expect(pnj?.maskColor, type.id).toEqual(DARK_COLOR)
            expect(type.glow, type.id).toEqual(DARK_COLOR)
        }
    })

    test("a halt saying nothing of a moment plays the default", () => {
        expect(SHOP_HALT.create(new Run(1)).look.pnj?.cues).toEqual(DEFAULT_CUES)
    })
})

describe("CUE_ANIMATIONS", () => {
    test("every move a halt names is an animation of the characters", () => {
        for(const cue of Object.keys(CUE_ANIMATIONS) as PnjCue[]){
            expect(PNJ_ANIMATIONS, cue).toContain(CUE_ANIMATIONS[cue])
        }
    })
})

import { describe, expect, test } from "vitest"
import { DEFAULT_CUES, FLOOR_TYPES, HALT_TYPES, PNJ_HATS, Run } from "@game/core/mecard"
import type { HaltMoment, PnjCue } from "@game/core/mecard"
import { PNJ_ANIMATIONS } from "@game/core/mecard/pnj"
import { CUE_ANIMATIONS } from "@game/core/mecard/travel-looks"

/** Every moment a character of a halt reacts to. */
const MOMENTS: readonly HaltMoment[] = ["arrive", "pick", "done", "refuse"]

/** How each kind of halt looks. */
const LOOKS = Object.entries(HALT_TYPES).map(([kind, type]) => [kind, type.create(new Run(1)).look] as const)

describe("the looks of the places", () => {
    test("nobody stands on the map, nor at a chest or an exit", () => {
        for(const type of FLOOR_TYPES) expect(type.look.pnj).toBeUndefined()
        expect(HALT_TYPES.chest.create(new Run(1)).look.pnj).toBeUndefined()
        expect(HALT_TYPES.exit.create(new Run(1)).look.pnj).toBeUndefined()
    })

    test("every other halt has a character, wearing its own hat, playing something at every moment", () => {
        for(const [place, look] of LOOKS){
            if(place === "chest" || place === "exit") continue
            const pnj = look.pnj
            expect(pnj, place).toBeDefined()
            expect(pnj?.hat, place).toBe(place)
            if(pnj?.hat) expect(PNJ_HATS[pnj.hat], place).toBeDefined()
            for(const moment of MOMENTS) expect(pnj?.cues[moment], `${place} at ${moment}`).toBeDefined()
        }
    })

    test("a halt saying nothing of a moment plays the default", () => {
        expect(HALT_TYPES.shop.create(new Run(1)).look.pnj?.cues).toEqual(DEFAULT_CUES)
    })
})

describe("CUE_ANIMATIONS", () => {
    test("every move a halt names is an animation of the characters", () => {
        for(const cue of Object.keys(CUE_ANIMATIONS) as PnjCue[]){
            expect(PNJ_ANIMATIONS, cue).toContain(CUE_ANIMATIONS[cue])
        }
    })
})

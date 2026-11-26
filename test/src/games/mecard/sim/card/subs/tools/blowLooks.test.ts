import { describe, expect, test } from "vitest"
import {
    ASSASSIN_BLOW, ASSASSINATION, BOUNCING_BOW, DAGGER, DEMONIC_STRIKE, RICOCHET, SHOT, THRUST,
} from "@game/core/mecard"
import { DEMON_SWEEP_LOOK, SHADOW_THRUST_LOOK, THRUST_LOOK } from "@game/core/mecard/blow-looks"

// --- Tests ---

describe("the looks of the blows of the cards", () => {
    test("a blow of an assassin → a thrust in a hue of its own", () => {
        for(const card of [ASSASSIN_BLOW, ASSASSINATION]) expect(card.look).toBe(SHADOW_THRUST_LOOK)
        expect(SHADOW_THRUST_LOOK.visual).toBe(THRUST_LOOK.visual)
        expect(SHADOW_THRUST_LOOK.coloration).not.toBeNull()
    })

    test("a plain thrust → no hue", () => {
        for(const card of [DAGGER, THRUST]) expect(card.look?.coloration ?? null).toBeNull()
    })

    test("a demonic strike → a blade turning, red", () => {
        expect(DEMONIC_STRIKE.look).toBe(DEMON_SWEEP_LOOK)
        const [red, green, blue] = DEMON_SWEEP_LOOK.coloration!
        expect(red).toBeGreaterThan(Math.max(green, blue))
    })

    test("a bow → arrows, a ricochet → bullets", () => {
        expect(SHOT.look.visual).toBe("arrow")
        expect(BOUNCING_BOW.look.visual).toBe("arrow")
        expect(RICOCHET.look.visual).toBe("bullet")
    })
})

import { describe, expect, test } from "vitest"
import { probeCard, probeEffects } from "@game/core-src/games/mecard/sim/analysis/CardProbe"
import {
    AIM_PROFILE,
    BITE_PROFILE,
    FILLER_PROFILE,
    profileOf,
    RUN_PROFILE,
} from "@game/core-src/games/mecard/sim/analysis/Profile"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { IMPROVISED_ROBOT } from "@game/core-src/games/mecard/sim/card/subs/mechanic/RobotCard"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { BOTTLE } from "@game/core-src/games/mecard/sim/card/subs/potion/PotionActions"
import { POISON, VIGOR } from "@game/core-src/games/mecard/sim/card/subs/potion/PotionCard"
import { ELEMENT_CARDS } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { POISONED } from "@game/core-src/games/mecard/sim/status/subs/Poison"
import { VIGOROUS } from "@game/core-src/games/mecard/sim/status/subs/Vigor"

// --- Tests ---

describe("probeCard", () => {
    test("a step → it moved the unit", () => {
        const measure = probeCard(STEP)
        expect(measure?.moved).toBeGreaterThan(0)
        expect(measure?.damage).toBe(0)
    })

    test("a thrust → it hurt the dummy", () => {
        expect(probeCard(THRUST)?.damage).toBeGreaterThan(0)
    })

    test("an aim → it turned the unit toward the dummy off to the side", () => {
        expect(probeCard(AIM)?.turned).toBeGreaterThan(0)
    })

    test("a card that takes an input → no measure, no error", () => {
        expect(probeCard(IMPROVISED_ROBOT)).toBeNull()
    })

    test("a card that does nothing seen → no measure", () => {
        expect(probeCard(WAIT)).toBeNull()
    })

    test("the same card twice → the same measure", () => {
        expect(probeCard(THRUST)).toBe(probeCard(THRUST))
    })
})

describe("probeEffects", () => {
    test("a potion that harms → the status it puts on the dummy, once a card throws it", () => {
        expect(probeEffects(POISON)?.onTarget).toContain(POISONED)
    })

    test("a potion that helps → the status it puts on the unit, once a card drinks it", () => {
        expect(probeEffects(VIGOR)?.onSelf).toContain(VIGOROUS)
    })

    test("a card that plays a potion → no effect of its own, it depends on the potion", () => {
        expect(probeEffects(BOTTLE)).toBeNull()
    })

    test("a potion → no measure of its own, so the profile does not depend on who carries it", () => {
        expect(probeCard(POISON)).toBeNull()
    })

    test("an element → the status the spells of the game put with it", () => {
        const seen = ELEMENT_CARDS.map(card => probeEffects(card)).filter(effects => effects !== null)
        expect(seen.length).toBeGreaterThan(0)
    })

    test("a potion → only its own status, not what a card that plays it puts on whatever it plays", () => {
        const effects = probeEffects(POISON)
        expect(effects?.onTarget).toEqual([POISONED])
        expect(effects?.onSelf).toEqual([POISONED])
    })

    test("the same potion twice → the same effects", () => {
        expect(probeEffects(POISON)).toBe(probeEffects(POISON))
    })
})

describe("profileOf", () => {
    test("a step → run", () => {
        expect(profileOf(STEP)).toBe(RUN_PROFILE)
    })

    test("a thrust → bite", () => {
        expect(profileOf(THRUST)).toBe(BITE_PROFILE)
    })

    test("an aim → aim", () => {
        expect(profileOf(AIM)).toBe(AIM_PROFILE)
    })

    test("a card with no hint → filler", () => {
        expect(profileOf(WAIT)).toBe(FILLER_PROFILE)
    })
})

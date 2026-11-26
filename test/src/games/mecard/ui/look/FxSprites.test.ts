import { describe, expect, test } from "vitest"
import { visual } from "@game/core/mecard"
import type { Visual } from "@game/core/mecard"
import { defaultAnimation } from "@game/core/mecard/fx-animation"
import { resolveFx } from "@game/core/mecard/fx-sprites"
import type { FxSource } from "@game/core/mecard/fx-sprites"
import { DEFAULT_LOOK } from "@game/core/mecard/sprite-look"

// --- Fixture builders ---

const SWEEP = defaultAnimation("sweep")
const STAB = defaultAnimation("stab")

/** The pictures of some blows, by key under `fx/` with the animation of their file, none for no file. */
function shelf(blows: Record<string, ReturnType<typeof defaultAnimation>|null>): FxSource {
    return {
        of: (look: Visual|null) => look && look.visual.replace("fx/", "") in blows ? ({ name: look.visual } as never) : null,
        look: (look: Visual|null) => ({ ...DEFAULT_LOOK, animation: blows[look?.visual.replace("fx/", "") ?? ""] ?? null }),
    }
}

// --- Tests ---

describe("resolveFx", () => {
    test("no look → drawn from the area", () => {
        expect(resolveFx(shelf({ slash: SWEEP }), null, [])).toEqual({ kind: "vector", rank: 0 })
    })

    test("a picture for the blow → that picture, with its animation", () => {
        const found = resolveFx(shelf({ slash: SWEEP }), visual("slash"), [])
        expect(found).toMatchObject({ kind: "sprite", key: "slash", animation: SWEEP, rank: 0 })
    })

    test("a picture for a tag of the target → preferred to the general one", () => {
        const found = resolveFx(shelf({ slash: SWEEP, slash_ghost: STAB }), visual("slash"), ["ghost"])
        expect(found).toMatchObject({ key: "slash_ghost", animation: STAB, rank: 0 })
    })

    test("no picture for the tags of the target → the general one, found further down", () => {
        const found = resolveFx(shelf({ slash: SWEEP }), visual("slash"), ["fly", "ghost"])
        expect(found).toMatchObject({ key: "slash", rank: 2 })
    })

    test("a variant without an animation → plays the animation of the general picture", () => {
        const found = resolveFx(shelf({ slash: SWEEP, slash_fly: null }), visual("slash"), ["fly"])
        expect(found).toMatchObject({ key: "slash_fly", animation: SWEEP })
    })

    test("a tinted blow → its hue given to the picture found, a variant for a tag included", () => {
        const red = visual("slash", { coloration: [1, 0, 0] })
        const found = resolveFx(shelf({ slash: SWEEP, slash_ghost: STAB }), red, ["ghost"])
        expect(found).toMatchObject({ key: "slash_ghost", coloration: [1, 0, 0] })
    })

    test("a blow without a hue → its picture drawn as it is", () => {
        expect(resolveFx(shelf({ slash: SWEEP }), visual("slash"), [])).toMatchObject({ coloration: null })
    })

    test("a picture without any animation → drawn from the area, never an error", () => {
        expect(resolveFx(shelf({ slash: null }), visual("slash"), [])).toEqual({ kind: "vector", rank: 1 })
        expect(resolveFx(shelf({}), visual("slash"), ["fly"])).toEqual({ kind: "vector", rank: 2 })
    })
})

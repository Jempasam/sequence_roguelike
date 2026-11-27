import { describe, expect, test } from "vitest"
import { WEATHER_VANE } from "@game/core-src/games/mecard/sim/item/subs/combat/Gadgets"
import { MAGNET, SCARY_MASK } from "@game/core-src/games/mecard/sim/item/subs/combat/Reflexes"
import { FIRE_FLASK } from "@game/core-src/games/mecard/sim/usable/subs/flask/FireFlask"
import { FOLDING_CACTUS } from "@game/core-src/games/mecard/sim/usable/subs/FoldingCactus"
import {
    FOLDING_TURRET,
    INFLATABLE_DECOY,
    WHISTLE,
} from "@game/core-src/games/mecard/sim/usable/subs/hand/ChainUsables"
import {
    IRON_MAGNET,
    KITE,
    PAWN_POWDER,
    SILENCE_JAR,
    SPRING,
} from "@game/core-src/games/mecard/sim/usable/subs/hand/ChessUsables"
import { PARCEL } from "@game/core-src/games/mecard/sim/usable/subs/Parcel"
import { WOOL_BALL } from "@game/core-src/games/mecard/sim/usable/subs/WoolBall"
import type { Indicator, Preview } from "@game/core-src/games/mecard/sim/battle/preview/Preview"

import { battle, MONSTERS, unit } from "../fixtures"

/** The kinds of the indicators of a preview. */
function kinds(preview: Preview): Indicator["kind"][] {
    return preview.indicators.map(indicator => indicator.kind)
}

/** A hero with an enemy within reach ahead of it, and one far behind. */
function scene() {
    const on = battle()
    const hero = unit(on, 3, 5)
    const near = unit(on, 3, 3, { team: MONSTERS })
    return { on, hero, near }
}

describe("Usable previews", () => {
    test.each([
        ["a fire flask", FIRE_FLASK],
        ["a wool ball", WOOL_BALL],
        ["a silence jar", SILENCE_JAR],
    ])("%s with an enemy in reach → the enemy marked", (_, thing) => {
        const { on, hero } = scene()
        const preview = thing.preview!({ battle: on, unit: hero, pose: hero })
        expect(kinds(preview)).toContain("polygon")
        expect(kinds(preview)).toContain("label")
    })

    test.each([
        ["a fire flask", FIRE_FLASK],
        ["a wool ball", WOOL_BALL],
        ["a silence jar", SILENCE_JAR],
    ])("%s with nobody in reach → only a word", (_, thing) => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 6, 0, { team: MONSTERS })
        expect(kinds(thing.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["label"])
    })

    test("a pawn powder with an ally near → the ally named, with none → nobody", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        expect(kinds(PAWN_POWDER.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["label"])
        unit(on, 3, 4)
        const [label] = PAWN_POWDER.preview!({ battle: on, unit: hero, pose: hero }).indicators
        expect(label).toMatchObject({ kind: "label", text: "promotion" })
    })

    test("a parcel with an ally → an arrow to it", () => {
        const { on, hero } = scene()
        unit(on, 4, 5)
        expect(kinds(PARCEL.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["arrow", "label"])
    })

    test("a whistle → its circle, and an arrow for each unit it would turn", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        expect(kinds(WHISTLE.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon", "arrow"])
    })

    test("a scary mask → its circle, and an arrow for each unit it would turn", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        expect(kinds(SCARY_MASK.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon", "arrow"])
    })

    test("a magnet → its circle, and an arrow from each unit it would pull", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 3, 3, { team: MONSTERS })
        expect(kinds(MAGNET.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon", "arrow"])
    })

    test("an iron magnet with no summon → its circle alone", () => {
        const { on, hero } = scene()
        expect(kinds(IRON_MAGNET.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon"])
    })

    test("a spring → the pose of the end of the throw, behind", () => {
        const on = battle()
        const hero = unit(on, 3, 2)
        const { pose } = SPRING.preview!({ battle: on, unit: hero, pose: hero })
        expect(pose.position.y).toBeGreaterThan(2)
        expect(pose.position.x).toBeCloseTo(3)
    })

    test("a kite → the pose of the landing, ahead", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const { pose } = KITE.preview!({ battle: on, unit: hero, pose: hero })
        expect(pose.position.y).toBeLessThan(6)
    })

    test("a weather vane → an arrow toward the nearest enemy", () => {
        const { on, hero } = scene()
        expect(kinds(WEATHER_VANE.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["arrow"])
    })

    test.each([
        ["a folding turret", FOLDING_TURRET],
        ["an inflatable decoy", INFLATABLE_DECOY],
        ["a folding cactus", FOLDING_CACTUS],
    ])("%s → the preview shows the spot where its body would stand", (_, thing) => {
        const { on, hero } = scene()
        expect(thing.preview!({ battle: on, unit: hero, pose: hero }).indicators.length).toBeGreaterThan(0)
    })
})

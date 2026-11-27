import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { FIRE_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Fire"
import { StatusType, statusVisual } from "@game/core-src/games/mecard/sim/status/Status"
import { STATUS_FAMILIES, STATUS_TYPES } from "@game/core-src/games/mecard/sim/status/statusTypes"
import { BURN } from "@game/core-src/games/mecard/sim/status/subs/Burn"
import { ritualType } from "@game/core-src/games/mecard/sim/status/subs/RitualStatus"
import { SOAKED } from "@game/core-src/games/mecard/sim/status/subs/Soaked"
import { soundOfStatus, STATUS_CUES } from "@game/core/mecard/status-sounds"

const GENERATED = join(__dirname, "../../../../../../generated_assets")

/** A kind of status that has no sound, of a polarity. */
function silentOf(polarity: "positive"|"negative"|"neutral"): StatusType {
    return new StatusType("sans son", statusVisual("burn", 1, 1, 1), polarity, () => { throw new Error("unused") })
}

describe("soundOfStatus", () => {
    test("every kind of status and every family → a sound of its own, not a fallback", () => {
        const fallbacks = ["positive", "negative", "neutral"].map(polarity => soundOfStatus(silentOf(polarity as "positive")))
        for(const type of [...STATUS_TYPES, ...STATUS_FAMILIES]){
            expect(fallbacks, type.name).not.toContain(soundOfStatus(type))
        }
    })

    test("a variant of a family → the sound of its family", () => {
        const variant = ritualType(FIRE_ELEMENT)
        expect(soundOfStatus(variant)).toBe(soundOfStatus(variant.family))
    })

    test("a kind with no sound → the fallback of its polarity", () => {
        const sounds = (["positive", "negative", "neutral"] as const).map(polarity => soundOfStatus(silentOf(polarity)))
        expect(new Set(sounds).size).toBe(3)
        expect(sounds[1].path).toBe("mecard/sounds/statuses/fallback_negative.ogg")
    })

    test("two kinds → two different sounds", () => {
        expect(soundOfStatus(BURN)).not.toBe(soundOfStatus(SOAKED))
    })

    test("every sound → a rendered file", () => {
        for(const { path } of STATUS_CUES){
            expect(existsSync(join(GENERATED, path)), path).toBe(true)
        }
    })
})

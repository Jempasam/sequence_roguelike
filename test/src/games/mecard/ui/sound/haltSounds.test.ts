import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import * as mecard from "@game/core/mecard"
import type { HaltType } from "@game/core/mecard"
import { HALT_CUES, soundOfHalt, soundOfImpact } from "@game/core/mecard/halt-sounds"

const GENERATED = join(__dirname, "../../../../../../generated_assets")

/** Every sort of halt of the game. */
const HALT_TYPES: HaltType[] = Object.values(mecard).filter((value): value is HaltType => (
    typeof value === "object" && value !== null && "id" in value && "icon" in value && !("category" in value)
    && "create" in value && typeof value.create === "function"
))

describe("soundOfHalt", () => {
    test("every sort of halt → a sound of its own, not the fallback", () => {
        const fallback = soundOfHalt({ id: "unknown" })
        expect(HALT_TYPES.length).toBeGreaterThan(40)
        for(const type of HALT_TYPES){
            expect(soundOfHalt(type).path, type.id).not.toBe(fallback.path)
        }
    })

    test("a sort with no sound → the fallback", () => {
        expect(soundOfHalt({ id: "unknown" }).path).toBe("mecard/sounds/halt/fallback.ogg")
    })

    test("a sort → an entrance sound and an impact sound, in two folders", () => {
        expect(soundOfHalt({ id: "chest" }).path).toBe("mecard/sounds/halt/chest.ogg")
        expect(soundOfImpact({ id: "chest" }).path).toBe("mecard/sounds/halt_impacts/chest.ogg")
        expect(soundOfImpact({ id: "unknown" }).path).toBe("mecard/sounds/halt_impacts/fallback.ogg")
    })

    test("two sorts → two different sounds", () => {
        const paths = new Set(HALT_TYPES.map(type => soundOfHalt(type).path))
        expect(paths.size).toBe(HALT_TYPES.length)
    })

    test("every sound → a rendered file", () => {
        for(const { path } of HALT_CUES){
            expect(existsSync(join(GENERATED, path)), path).toBe(true)
        }
    })
})

import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { ALL_FIGHT_CATEGORIES, BATTLE, BOSS } from "@game/core/mecard"
import { FIGHT_CUES, soundOfFight } from "@game/core/mecard/fight-sounds"

const GENERATED = join(__dirname, "../../../../../../generated_assets")

describe("soundOfFight", () => {
    test("every category of fight → a sound of its own, not the fallback", () => {
        const fallback = soundOfFight(null)
        for(const category of ALL_FIGHT_CATEGORIES){
            expect(soundOfFight(category), category.id).not.toBe(fallback)
        }
    })

    test("no category → the fallback", () => {
        expect(soundOfFight(null).path).toBe("mecard/sounds/fights/fallback.ogg")
        expect(soundOfFight(undefined)).toBe(soundOfFight(null))
        expect(soundOfFight({ id: "unknown" })).toBe(soundOfFight(null))
    })

    test("two categories → two different sounds", () => {
        expect(soundOfFight(BATTLE)).not.toBe(soundOfFight(BOSS))
    })

    test("every sound → a rendered file", () => {
        for(const { path } of FIGHT_CUES){
            expect(existsSync(join(GENERATED, path)), path).toBe(true)
        }
    })
})

import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { ALL_KITS, ALL_MONSTERS, ALL_PETS, BOSS_MONSTERS, Rng, visual } from "@game/core/mecard"
import {
    BOSS_HEARTS_RATIO, OWN_VOICE_KEYS, UNIT_CUES, voiceOf, voiceOfBattle,
} from "@game/core/mecard/unit-sounds"
import type { VoiceSource } from "@game/core/mecard/unit-sounds"

const GENERATED = join(__dirname, "../../../../../../generated_assets")

/** A unit as the voice of a battle sees it. */
function unitOf(key: string, hearts: number): VoiceSource {
    return { sprite: visual(`units/${key}`), hearts: { maxHearts: hearts } }
}

describe("voiceOf", () => {
    test("every unit of the catalogs → a voice of its own, not a fallback", () => {
        const sprites = [...ALL_MONSTERS, ...BOSS_MONSTERS, ...ALL_PETS, ...ALL_KITS].map(each => each.sprite)
        for(const sprite of sprites){
            const path = voiceOf(sprite).path
            expect(path, sprite.visual).toBe(`mecard/sounds/unit/${sprite.visual.replace("units/", "")}.ogg`)
        }
    })

    test("a picture named for a kind, with no voice of its own → the voice of the kind", () => {
        expect(voiceOf(visual("units/cave_goblin")).path).toBe("mecard/sounds/unit/keyword/goblin.ogg")
        expect(voiceOf(visual("units/dune_archer")).path).toBe("mecard/sounds/unit/keyword/archer.ogg")
    })

    test("a picture of no known kind → the voice of its color", () => {
        expect(voiceOf(visual("units/zork", { color: [0.9, 0.1, 0.1] })).path).toBe("mecard/sounds/unit/color/red.ogg")
        expect(voiceOf(visual("units/zork", { color: [0.1, 0.8, 0.2] })).path).toBe("mecard/sounds/unit/color/green.ogg")
        expect(voiceOf(visual("units/zork", { color: [0.2, 0.3, 0.9] })).path).toBe("mecard/sounds/unit/color/blue.ogg")
    })

    test("a recolored picture of no known kind → the voice of the hue it is recolored with", () => {
        const sprite = visual("units/zork", { color: [0.5, 0.5, 0.5], coloration: [0.9, 0.9, 0.1] })
        expect(voiceOf(sprite).path).toBe("mecard/sounds/unit/color/yellow.ogg")
    })

    test("a grey picture of no known kind → the neutral voice", () => {
        expect(voiceOf(visual("units/zork")).path).toBe("mecard/sounds/unit/color/neutral.ogg")
    })

    test("every voice → a rendered file", () => {
        expect(OWN_VOICE_KEYS.length).toBeGreaterThan(100)
        for(const { path } of UNIT_CUES){
            expect(existsSync(join(GENERATED, path)), path).toBe(true)
        }
    })
})

describe("voiceOfBattle", () => {
    test("no unit → no voice", () => {
        expect(voiceOfBattle([], new Rng(1))).toBeNull()
    })

    test("a unit with far more hearts than the others → its voice, whatever the draw", () => {
        const units = [unitOf("goblin", 4), unitOf("wolf", 4), unitOf("devil", 4 * BOSS_HEARTS_RATIO)]
        for(let seed = 0; seed < 30; seed++){
            expect(voiceOfBattle(units, new Rng(seed))?.path).toBe("mecard/sounds/unit/devil.ogg")
        }
    })

    test("units of near hearts → the voice of one of them, each drawn in time", () => {
        const units = [unitOf("goblin", 4), unitOf("wolf", 5), unitOf("bear", 6)]
        const heard = new Set<string>()
        for(let seed = 0; seed < 200 && heard.size < units.length; seed++){
            heard.add(voiceOfBattle(units, new Rng(seed))!.path)
        }
        expect([...heard].sort()).toEqual([
            "mecard/sounds/unit/bear.ogg", "mecard/sounds/unit/goblin.ogg", "mecard/sounds/unit/wolf.ogg",
        ])
    })

    test("a single unit → its voice, boss or not", () => {
        expect(voiceOfBattle([unitOf("troll", 30)], new Rng(1))?.path).toBe("mecard/sounds/unit/troll.ogg")
    })
})

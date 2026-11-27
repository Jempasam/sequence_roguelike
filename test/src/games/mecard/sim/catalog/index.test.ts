import { describe, expect, test } from "vitest"
import { plainText } from "@game/core-src/semantic/Text"
import { SHOT } from "@game/core-src/games/mecard/sim/card/subs/attack/Shot"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { SWEEP } from "@game/core-src/games/mecard/sim/card/subs/attack/Sweep"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { BOMB } from "@game/core-src/games/mecard/sim/card/subs/combat/Bomb"
import { FLAMETHROWER } from "@game/core-src/games/mecard/sim/card/subs/combat/Flamethrower"
import { PUSH } from "@game/core-src/games/mecard/sim/card/subs/combat/Push"
import { TASER } from "@game/core-src/games/mecard/sim/card/subs/combat/Taser"
import { SPELL } from "@game/core-src/games/mecard/sim/card/subs/spell/SpellCard"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { GLASS_HEART } from "@game/core-src/games/mecard/sim/heart/subs/GlassHeartKind"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { SHIELD_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ShieldHeartKind"
import { THORN_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ThornHeartKind"

// --- Fixture builders ---

/** Every value of the catalog that tells itself, with a description when it has one. */
const TOLD = [...ALL_CARDS, ...ALL_ITEMS, RED_HEART, SHIELD_HEART, THORN_HEART, GLASS_HEART]

/** Does a plain text hold an object that told nothing, or a part that was missing? */
function isBroken(text: string): boolean {
    return text.includes("[object") || text.includes("undefined")
}

// --- Tests ---

describe("catalog texts", () => {
    test("every name and description → told whole", () => {
        for(const value of TOLD){
            expect(isBroken(plainText(value)), value.name).toBe(false)
            expect(isBroken(plainText(value.description)), value.name).toBe(false)
        }
        for(const monster of ALL_MONSTERS) expect(plainText(monster)).toBe(monster.name)
    })

    test("each weapon → its base damage", () => {
        for(const weapon of [SHOT, SLASH, THRUST, SWEEP, BOMB, FLAMETHROWER, TASER, PUSH, SPELL]){
            expect(plainText(weapon.description), weapon.name).toMatch(/\d.* dégâts (physiques|élémentaires)/)
        }
    })

    test("a blow → its bonus on top", () => {
        expect(plainText(SLASH.description)).toContain("2+force dégâts physiques")
    })
})

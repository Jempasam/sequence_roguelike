import { describe, expect, test } from "vitest"
import { Arena, Battle, enterBattle, foeOf, GOBLIN, heroOf, LANCER_KIT, Team, Vector2 } from "@game/core/mecard"

// --- Tests ---

describe("enterBattle", () => {
    test("a kit on the foes' side, a monster on the allies' → the deck order follows the character, not the side", () => {
        const battle = new Battle(new Arena(20, 20), 1)
        const kit = enterBattle(battle, heroOf(LANCER_KIT), new Team("monstres"), new Vector2(5, 5), "enemy", "bot")
        const monster = enterBattle(battle, foeOf(GOBLIN, "Gobelin"), new Team("héros"), new Vector2(10, 10), "ally", "bot")
        expect(kit.stats.ordered.value).toBe(false)
        expect(monster.stats.ordered.value).toBe(true)
    })
})

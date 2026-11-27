import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { Arena } from "@game/core-src/games/mecard/sim/battle/Arena"
import { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { Team } from "@game/core-src/games/mecard/sim/battle/Team"
import { LANCER_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { enterBattle } from "@game/core-src/games/mecard/sim/run/arena"
import { foeOf, heroOf } from "@game/core-src/games/mecard/sim/run/Hero"

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

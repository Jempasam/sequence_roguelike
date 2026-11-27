import { describe, expect, test } from "vitest"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { monstersOf } from "@game/core-src/games/mecard/sim/fight/monstersOf"
import { GOBLIN, TROLL } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { CASTLE_FIGHTS } from "@game/core-src/games/mecard/sim/floor/fights/castleFights"
import { fightOf } from "../../../../fixtures/fightFixtures"

describe("the monsters of a fight", () => {

    test("a fight of monsters → each of them, in the order it adds them", () => {
        expect(monstersOf(fightOf(BATTLE, TROLL, GOBLIN))).toEqual([TROLL, GOBLIN])
    })

    test("a fight read twice → the same monsters", () => {
        const fight = fightOf(BATTLE, GOBLIN)
        expect(monstersOf(fight)).toEqual(monstersOf(fight))
    })

    test("a fight against kits → none", () => {
        const duel = CASTLE_FIGHTS.find(each => each.type.name === "Duel de chevaliers")!
        expect(monstersOf(duel.type)).toEqual([])
    })
})

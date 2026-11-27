import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { PILLAR } from "@game/core-src/games/mecard/sim/catalog/hazards"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { foeOf } from "@game/core-src/games/mecard/sim/run/Hero"
import {
    bodies, carriers, freshHeroes, heroes, isPet, lastHeart, pairsWithin, petsByAFriend, playerHeroes, weary,
} from "@game/core-src/games/mecard/ui/travel/ambient/unit/selection"
import { contextOf, heroShown, petShown } from "../../../../../../fixtures/ambientFixtures"
import type { Shown } from "../../../../../../fixtures/ambientFixtures"
import { battle, MONSTERS, unit } from "../../../../sim/fixtures"

/** A unit of a battle as an ambient is shown it. */
function shown(of: Unit): Shown {
    const { x, y } = of.position
    return {
        unit: of, position: { x, y }, head: { x, y: y - 1 }, facing: { x: 0, y: -1 }, hearts: of.hearts.all,
    }
}

function over(units: readonly Shown[]) {
    return contextOf([], { units: () => units })
}

describe("the units an ambient effect may take", () => {

    test("a pillar on the arena → it is not a body", () => {
        const on = battle()
        const walker = unit(on, 1, 1)
        PILLAR.lay(on, new Vector2(4, 4))
        const taken = bodies(over(on.units.map(shown)))
        expect(on.units).toHaveLength(2)
        expect(taken.map(each => each.unit)).toEqual([walker])
    })

    test("a unit of a battle → not a hero of the map, but one the players play", () => {
        const context = over([shown(unit(battle(), 1, 1))])
        expect(heroes(context)).toEqual([])
        expect(playerHeroes(context)).toHaveLength(1)
    })

    test("a third of its hearts left or less → worn out", () => {
        const context = over([heroShown({ x: 0, full: 1 }), heroShown({ x: 20, full: 2 })])
        expect(weary(context).map(each => each.position.x)).toEqual([0])
    })

    test("a single heart out of one → not on its last heart", () => {
        const alone = heroShown({ x: 0, full: 1, total: 1 })
        const context = over([alone, heroShown({ x: 20, full: 1, total: 4 })])
        expect(lastHeart(context).map(each => each.position.x)).toEqual([20])
    })

    test("a heart missing → not fresh", () => {
        const context = over([heroShown({ x: 0, full: 2 }), heroShown({ x: 20 })])
        expect(freshHeroes(context).map(each => each.position.x)).toEqual([20])
    })

    test("a bot with a shuffled deck → a pet, not the players nor a foe that keeps its order", () => {
        expect(isPet(petShown(0))).toBe(true)
        expect(isPet(heroShown({ x: 0 }))).toBe(false)
        expect(isPet({ ...heroShown({ x: 0 }), unit: foeOf(GOBLIN, "Gobelin") })).toBe(false)
    })

    test("a pet beside a hero → patted, not one far away", () => {
        const context = over([heroShown({ x: 0 }), petShown(20), petShown(200)])
        expect(petsByAFriend(30)(context).map(each => each.position.x)).toEqual([20])
    })

    test("two pets side by side, no friend near → none patted", () => {
        expect(petsByAFriend(30)(over([petShown(0), petShown(16)]))).toEqual([])
    })

    test("a pet beside a hero of the other side of a battle → not patted", () => {
        const on = battle()
        const hero = unit(on, 1, 1)
        const pet = on.add({
            name: "pet", team: MONSTERS, controller: "bot", position: new Vector2(2, 1),
            direction: Vector2.UP, hearts: hero.hearts.all, decks: [[]],
        })
        expect(petsByAFriend(30)(over([shown(hero), shown(pet)]))).toEqual([])
    })

    test("nothing carried → not a carrier", () => {
        const context = over([heroShown({ x: 0 }), shown(unit(battle(), 1, 1))])
        expect(carriers(context).map(each => each.position.x)).toEqual([0])
    })

    test("units too far apart → no pair", () => {
        expect(pairsWithin([heroShown({ x: 0 }), heroShown({ x: 100 })], 60)).toEqual([])
    })

    test("two units of two sides side by side → no pair", () => {
        const on = battle()
        const sides = [shown(unit(on, 1, 1)), shown(unit(on, 2, 1, { team: MONSTERS }))]
        expect(pairsWithin(sides, 60)).toEqual([])
    })
})

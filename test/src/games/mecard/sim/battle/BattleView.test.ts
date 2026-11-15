import { describe, expect, test } from "vitest"
import { AIM, Battle, FIRE, Heart, RED_HEART, SECRET_CARD, SLASH, STEP, Vector2, savedCard, secretizeSave } from "@game/core/mecard"
import type { Card, Team } from "@game/core/mecard"

import { battle, HEROES, MONSTERS } from "../fixtures"

const PILE: readonly Card[] = [SLASH, STEP, AIM, FIRE, SLASH, STEP, AIM, FIRE]
const SECRET = savedCard(SECRET_CARD)

/** A battle of a hero and a monster, each with a pile and a hand. */
function twoSides(): { on: Battle, hero: ReturnType<Battle["add"]>, monster: ReturnType<Battle["add"]> } {
    const on = battle()
    const make = (team: Team, x: number, y: number) => on.add({
        name: team.name, team, controller: "player", position: new Vector2(x, y), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 3), decks: [[...PILE]],
    })
    const hero = make(HEROES, 3, 5)
    const monster = make(MONSTERS, 3, 1)
    hero.hand.push(SLASH, STEP)
    monster.hand.push(AIM, FIRE)
    return { on, hero, monster }
}

describe("Battle.clone", () => {
    test("→ the same state, as a battle of its own", () => {
        const { on } = twoSides()
        const copy = on.clone()
        expect(copy).not.toBe(on)
        expect(copy.save()).toEqual(on.save())
        copy.startRound()
        expect(on.round).toBe(0)
    })
})

describe("secretizeSave", () => {
    test("by default → its team's piles shuffled, the foes' piles secret, the hands shown, the rng changed", () => {
        const { on, hero } = twoSides()
        const save = on.save()
        const seen = secretizeSave(save, on.units.indexOf(hero), { seed: 1 })
        const mine = seen.units[0].decks[0].pile
        const theirs = seen.units[1].decks[0].pile
        expect([...mine].sort()).toEqual([...save.units[0].decks[0].pile].sort())
        expect(theirs.length).toBe(PILE.length)
        expect(theirs.every(card => card === SECRET)).toBe(true)
        expect(seen.units[1].hand).toEqual(save.units[1].hand)
        expect(seen.rng).not.toBe(save.rng)
    })

    test("the save given → left as it was", () => {
        const { on, hero } = twoSides()
        const save = on.save()
        const before = JSON.stringify(save)
        secretizeSave(save, on.units.indexOf(hero))
        expect(JSON.stringify(save)).toBe(before)
    })

    test("each option → as told", () => {
        const { on, hero } = twoSides()
        const save = on.save()
        const seen = secretizeSave(save, on.units.indexOf(hero), {
            allyDeck: "show",
            otherDeck: "show",
            otherHand: "secret",
            rng: false,
        })
        expect(seen.units[0].decks[0].pile).toEqual(save.units[0].decks[0].pile)
        expect(seen.units[1].decks[0].pile).toEqual(save.units[1].decks[0].pile)
        expect(seen.units[1].hand.every(card => card === SECRET)).toBe(true)
        expect(seen.units[0].hand).toEqual(save.units[0].hand)
        expect(seen.rng).toBe(save.rng)
    })
})

describe("Battle.secretize", () => {
    test("→ the battle as the viewer knows it, which still loads and plays", () => {
        const { on, hero, monster } = twoSides()
        const copy = on.clone()
        copy.secretize(copy.units[on.units.indexOf(hero)])
        const foe = copy.units[on.units.indexOf(monster)]
        expect(foe.decks.all[0].pile.every(card => card === SECRET_CARD)).toBe(true)
        copy.startRound()
        expect(copy.round).toBe(1)
        expect(on.units[1].decks.all[0].pile.every(card => card !== SECRET_CARD)).toBe(true)
    })

    test("a unit that is not in the battle → refused", () => {
        const { on } = twoSides()
        const other = twoSides().hero
        expect(() => on.secretize(other)).toThrow("not in this battle")
    })
})

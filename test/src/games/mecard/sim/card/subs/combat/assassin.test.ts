import { describe, expect, test } from "vitest"
import {
    BLOODLUST, BLOODLUST_CARD, BLOODLUST_STRIDE, Heart, LEAP, loadBattle, MINE, placeMine,
    RED_HEART, saveBattle, SHADOW,
    STEP, TURNS, Vector2, WAIT,
} from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("BLOODLUST_CARD", () => {
    test("a step toward the frailest enemy goes a stride further, once", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 3, 1, { team: MONSTERS })
        play(on, [[hero, chain(BLOODLUST_CARD, STEP)]])
        expect(on.units[0].statusOf(BLOODLUST)).toBeDefined()
        expectAt(hero, 3, 6 - 2 - BLOODLUST_STRIDE)
    })

    test("a step away from it → as it is", () => {
        const on = battle()
        const hero = unit(on, 3, 3, { direction: Vector2.DOWN })
        unit(on, 3, 1, { team: MONSTERS })
        play(on, [[hero, chain(BLOODLUST_CARD, STEP)]])
        expectAt(hero, 3, 5)
    })

    test("a step that does not move → as it is", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        unit(on, 3, 1, { team: MONSTERS })
        play(on, [[hero, chain(BLOODLUST_CARD, TURNS[12], WAIT)]])
        expectAt(hero, 3, 3)
    })

    test("lasts three rounds, and comes back from a save", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(BLOODLUST_CARD)]])
        expect(String(hero.statusOf(BLOODLUST))).toBe("soif de sang 2 rounds")
        const again = loadBattle(saveBattle(on))
        expect(String(again.units[0].statusOf(BLOODLUST))).toBe("soif de sang 2 rounds")
    })
})

describe("SHADOW", () => {
    test("the round over → back at the shadow, wounding each body on the way, whatever its strength", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        hero.stats.strength.base = 5
        const foe = unit(on, 3, 4.5, { team: MONSTERS, hearts: Heart.many(RED_HEART, 6) })
        play(on, [[hero, chain(SHADOW, LEAP)]])
        expectAt(hero, 3, 6)
        expect(foe.life).toBe(5)
    })

    test("a unit that dies first leaves nothing going on", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        unit(on, 1, 3, { team: MONSTERS })
        on.startRound()
        hero.hand.push(SHADOW, WAIT)
        on.commit(hero, chain(SHADOW, WAIT))
        on.endPreparation()
        for(let tick = 0; tick < 30; tick++) on.tick()
        hero.hearts.slay(null)
        on.playRound()
        expect(hero.processes).toEqual([])
    })

    test("is gone with the round", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(SHADOW)]])
        expect(on.units.filter(body => body.sprite?.visual === "units/shadow")).toEqual([])
    })
})

describe("MINE", () => {
    test("a body coming to touch it → goes off, wounding around, and is gone", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const hearts = Heart.many(RED_HEART, 6)
        const foe = unit(on, 3, 1, { team: MONSTERS, direction: Vector2.DOWN, hearts })
        const mine = placeMine(on, hero, new Vector2(3, 2.5))
        play(on, [[foe, chain(STEP)]])
        expect(mine?.alive).toBe(false)
        expect(foe.life).toBe(4)
    })

    test("left alone → waits for its rounds, then wears out", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        const mine = placeMine(on, hero, new Vector2(5, 3))
        play(on, [])
        expect(mine?.alive).toBe(true)
        play(on, [])
        play(on, [])
        expect(mine?.alive).toBe(false)
    })

    test("thrown ahead by its card, and comes back from a save", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(MINE)]])
        const again = loadBattle(saveBattle(on))
        const body = again.units.find(each => each.sprite?.visual === "units/mine")
        expect(body?.position.y).toBeCloseTo(5)
        expect(saveBattle(loadBattle(saveBattle(on)))).toEqual(saveBattle(on))
    })
})

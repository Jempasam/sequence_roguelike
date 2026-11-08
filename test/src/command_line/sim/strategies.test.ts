import { describe, expect, test } from "vitest"
import { AIM, FIRE, GAMBLE, Rng, SHOT, SLASH, STEP, TURN_RIGHT } from "@game/core/mecard"
import type { Battle, Card, Unit } from "@game/core/mecard"
import { parseStrategy, STRATEGIES, UsageError } from "@game/command_line/sim"

import { battle, HEROES, MONSTERS, unit } from "../../games/mecard/sim/fixtures"

// --- Fixture builders ---

const HAND: readonly Card[] = [STEP, STEP, AIM, SLASH, SHOT, FIRE, GAMBLE, TURN_RIGHT]

/** A battle in its preparation, a hero and a monster each holding a hand. */
function preparing(): { on: Battle, hero: Unit, monster: Unit } {
    const on = battle()
    const hero = unit(on, 3, 5, { team: HEROES, hand: [...HAND] })
    const monster = unit(on, 3, 1, { team: MONSTERS, hand: [...HAND] })
    on.startRound()
    return { on, hero, monster }
}

/** What parsing a strategy says when it refuses it. */
function refused(text: string): string {
    try {
        parseStrategy(text, "--ai")
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The strategy was accepted.")
}

// --- Tests ---

describe("parseStrategy", () => {
    test("a name → the AI, using the usables", () => {
        expect(parseStrategy("deck", "--ai")).toMatchObject({ name: "deck", usables: true, deck: true })
        expect(parseStrategy("random", "--ai")).toMatchObject({ name: "random", usables: true, deck: false })
    })

    test("-usables → the usables left unused, and said in the name", () => {
        expect(parseStrategy("deck-usables", "--ai")).toMatchObject({ name: "deck-usables", usables: false })
    })

    test("lookahead → six chains by default, or as many as asked", () => {
        expect(parseStrategy("lookahead", "--ai").name).toBe("lookahead:6")
        expect(parseStrategy("lookahead:8-usables", "--ai")).toMatchObject({ name: "lookahead:8-usables", usables: false })
    })

    test("what is wrong → told with the AIs there are", () => {
        expect(refused("smart")).toContain("IA disponibles : deck")
        expect(refused("deck:3")).toContain("ne prend pas d'argument")
        expect(refused("lookahead:1")).toContain("au moins 2 chaînes")
    })

    test("every AI → described", () => {
        for(const each of STRATEGIES) expect(each.description.length).toBeGreaterThan(0)
    })
})

describe("Strategy.plan", () => {
    test.each(["deck", "random", "lookahead"])("%s → a chain the battle commits, of cards of the hand, within the size", name => {
        const { on, hero } = preparing()
        const rng = new Rng(5)
        for(let times = 0; times < 20; times++){
            const chain = parseStrategy(name, "--ai").plan(hero, on, rng)
            expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
            for(const card of chain.cards) expect(HAND).toContain(card)
            on.commit(hero, chain)
            on.commit(hero, new (chain.constructor as new () => typeof chain)())
        }
    })
})

describe("Strategy.refine", () => {
    test("lookahead → thinks about the round, and commits a chain that plays out", () => {
        const { on, hero, monster } = preparing()
        const rng = new Rng(9)
        const strategy = parseStrategy("lookahead:4", "--ai")
        on.commit(hero, strategy.plan(hero, on, rng))
        on.commit(monster, strategy.plan(monster, on, rng))
        expect(strategy.refine?.(hero, on, rng)).toBe(true)
        const chain = on.planOf(hero)
        expect(chain?.size ?? 0).toBeLessThanOrEqual(hero.stats.chainSize.value)
        on.endPreparation()
        on.playRound()
        expect(on.round).toBe(1)
    })

    test("deck and random → nothing to think about", () => {
        expect(parseStrategy("deck", "--ai").refine).toBeUndefined()
        expect(parseStrategy("random", "--ai").refine).toBeUndefined()
    })
})

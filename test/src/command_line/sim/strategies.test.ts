import { describe, expect, test } from "vitest"
import { AIM, askAi, CardChain, FIRE, GAMBLE, Heart, RED_HEART, Rng, SHOT, SLASH, STEP, TurnCard, TURNS, UNLIMITED_CARDS, Vector2 } from "@game/core/mecard"
import type { Battle, Card, Unit } from "@game/core/mecard"
import { parseStrategy, STRATEGIES, UsageError } from "@game/command_line/sim"

import { battle, HEROES, MONSTERS, unit } from "../../games/mecard/sim/fixtures"

// --- Fixture builders ---

const HAND: readonly Card[] = [STEP, STEP, AIM, SLASH, SHOT, FIRE, GAMBLE, TURNS[4]]

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

    test("smart2 → six chains by default, or as many as asked", () => {
        expect(parseStrategy("smart2", "--ai").name).toBe("smart2:6")
        expect(parseStrategy("smart2:8-usables", "--ai")).toMatchObject({ name: "smart2:8-usables", usables: false })
    })

    test("smart9 and smart10 → names with underscores and letters, with their count", () => {
        expect(parseStrategy("smart9_1_2", "--ai").name).toBe("smart9_1_2:6")
        expect(parseStrategy("smart10", "--ai").name).toBe("smart10:6")
        expect(parseStrategy("smart10_blind:4-usables", "--ai")).toMatchObject({ name: "smart10_blind:4-usables", usables: false })
        for(const name of ["smart10_position", "smart10_future", "smart10_smartfuture", "smart10_safe", "smart10_unsafe"]){
            const strategy = parseStrategy(name, "--ai")
            expect(strategy.name).toBe(`${name}:6`)
            expect(strategy.ai(new Rng(1))).toBeDefined()
        }
    })

    test("smart1 → the first lookahead, kept to compare, with its count", () => {
        expect(parseStrategy("smart1", "--ai").name).toBe("smart1:6")
        expect(parseStrategy("smart1:3", "--ai").name).toBe("smart1:3")
        expect(refused("smart1:1")).toContain("au moins 2 chaînes")
    })

    test("smart4 → smart3 that may play less, with its count", () => {
        expect(parseStrategy("smart4", "--ai").name).toBe("smart4:6")
        expect(parseStrategy("smart4:3-usables", "--ai")).toMatchObject({ name: "smart4:3-usables", usables: false, choosesUsables: false })
        expect(parseStrategy("smart4", "--ai").choosesUsables).toBe(true)
        expect(refused("smart4:1")).toContain("au moins 2 chaînes")
    })

    test("smart → the latest smartN, named as it, with its count", () => {
        expect(parseStrategy("smart", "--ai").name).toBe("smart8:6")
        expect(parseStrategy("smart:3-usables", "--ai").name).toBe("smart8:3-usables")
        expect(refused("smart:1")).toContain("au moins 2 chaînes")
    })

    test("what is wrong → told with the AIs there are", () => {
        expect(refused("smartx")).toContain("IA disponibles : deck")
        expect(refused("deck:3")).toContain("ne prend pas d'argument")
        expect(refused("smart2:1")).toContain("au moins 2 chaînes")
    })

    test("every AI → described", () => {
        for(const each of STRATEGIES) expect(each.description.length).toBeGreaterThan(0)
    })
})

describe("Strategy.ai", () => {
    test.each(["deck", "random", "smart1", "smart2", "smart3", "smart4", "smart5", "smart6", "smart7", "smart"])("%s → a chain the battle commits, of cards of the hand, within the size", name => {
        const { on, hero } = preparing()
        const ai = parseStrategy(name, "--ai").ai(new Rng(5))
        for(let times = 0; times < 5; times++){
            const { chain } = askAi(on, hero, ai)
            expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
            for(const card of chain.cards) expect(HAND).toContain(card)
            on.commit(hero, chain)
        }
    })

    test("smart2 → decides the round, and its chain plays out against a foe that has chosen nothing", () => {
        const { on, hero } = preparing()
        const { chain } = askAi(on, hero, parseStrategy("smart2:4", "--ai").ai(new Rng(9)))
        expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
        on.commit(hero, chain)
        on.endPreparation()
        on.playRound()
        expect(on.round).toBe(1)
    })

    test("an AI → decides on a copy of the battle, and what it plays there leaves the battle as it was", () => {
        const { on, hero } = preparing()
        const before = JSON.stringify(on.save())
        askAi(on, hero, {
            decide(unit, view){
                expect(view).not.toBe(on)
                expect(unit).toBe(view.units[on.units.indexOf(hero)])
                view.commit(unit, CardChain.leftToRight(unit.hand, unit.stats.chainSize.value))
                view.endPreparation()
                view.playRound()
                return { chain: new CardChain() }
            },
        })
        expect(JSON.stringify(on.save())).toBe(before)
    })

    test.each(["smart1:4", "smart2:4", "smart3:4", "smart4:4", "smart5:4", "smart6:4", "smart7:4"])("%s with a hero playing step and turns unlimited → a chain that plays out", name => {
        const on = battle()
        const hero = on.add({
            name: "héros",
            team: HEROES,
            controller: "player",
            position: new Vector2(3, 5),
            direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4),
            decks: [[]],
            unlimited: UNLIMITED_CARDS,
        })
        hero.hand.push(SLASH, AIM)
        unit(on, 1, 1, { team: MONSTERS, hand: [SLASH] })
        on.startRound()
        const { chain } = askAi(on, hero, parseStrategy(name, "--ai").ai(new Rng(9)))
        expect(chain.size).toBeGreaterThan(0)
        expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
        expect(chain.cards.filter(card => card instanceof TurnCard).length).toBeLessThanOrEqual(1)
        expect(chain.cards.filter(card => card === STEP).length).toBeLessThanOrEqual(1)
        on.commit(hero, chain)
        on.endPreparation()
        on.playRound()
        expect(on.round).toBe(1)
    })

    test("smart2 with an empty hand and cards unlimited → still moves", () => {
        const on = battle()
        const hero = on.add({
            name: "héros",
            team: HEROES,
            controller: "player",
            position: new Vector2(3, 5),
            direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4),
            decks: [[]],
            unlimited: UNLIMITED_CARDS,
        })
        unit(on, 1, 1, { team: MONSTERS })
        on.startRound()
        const { chain } = askAi(on, hero, parseStrategy("smart2", "--ai").ai(new Rng(3)))
        expect(chain.size).toBeGreaterThan(0)
    })
})

import { describe, expect, test } from "vitest"
import {
    aiNamed, allRules, DeckAi, Heart, LookaheadAi, MOVES_RULE, PATH_AIM, PURSUIT, RED_HEART, Rng, Run,
    RunUnitRules, SHUFFLE_RULE, SLASH, smartRule, STEP, STRIP_PATH_RULE, STRIP_STEP_RULE, UNLIMITED_CARDS,
    Vector2,
} from "@game/core/mecard"
import type { Battle, Card, Controller, Unit, UnitRule } from "@game/core/mecard"

import { battle, HEROES, MONSTERS } from "../fixtures"

// --- Fixture builders ---

const DECK: readonly Card[] = [PATH_AIM, STEP, SLASH, PURSUIT]

/** A monster played by a bot, its deck kept in order, at a column of the arena. */
function monster(on: Battle, x: number, controller: Controller = "bot", cards: readonly Card[] = DECK): Unit {
    return on.add({
        name: `m${x}`, team: MONSTERS, controller, position: new Vector2(x, 1), direction: Vector2.DOWN,
        hearts: Heart.many(RED_HEART, 4), decks: [cards], bases: { ordered: true },
    })
}

/** A battle with a hero of the players and a monster. */
function facing(): { on: Battle, hero: Unit, foe: Unit } {
    const on = battle()
    const hero = on.add({
        name: "héros", team: HEROES, controller: "player", position: new Vector2(3, 5), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [DECK],
    })
    return { on, hero, foe: monster(on, 3) }
}

/** A run changed by rules, and what they told. */
function ruled(...rules: readonly UnitRule[]): { run: Run, held: RunUnitRules, told: string[] } {
    const run = new Run(1)
    const told: string[] = []
    const held = new RunUnitRules(run, text => told.push(text))
    for(const rule of rules) held.set(rule)
    return { run, held, told }
}

/** The cards left to draw by a unit. */
function pile(of: Unit): Card[] {
    return of.decks.piles
}

// --- Tests ---

describe("RunUnitRules", () => {
    test("a battle starting → the bots with cards changed, and named", () => {
        const { run, told } = ruled(MOVES_RULE)
        const { on, hero, foe } = facing()
        run.playBattle(on)
        expect(foe.unlimited).toEqual(UNLIMITED_CARDS)
        expect(hero.unlimited).toEqual([])
        expect(told).toEqual(["Règles appliquées à : m3."])
    })

    test("a smart bot, a bot with no card, a pillar → left as they are, and said so", () => {
        const { run, told } = ruled(MOVES_RULE)
        const on = battle()
        const smart = monster(on, 1, aiNamed("smart2", new Rng(1), 0))
        const empty = monster(on, 3, "bot", [])
        const pillar = on.addPillar(new Vector2(5, 5), 0.5)
        run.playBattle(on)
        for(const each of [smart, empty, pillar]) expect(each.unlimited).toEqual([])
        expect(told).toEqual(["Règles : aucune unité à modifier dans ce combat."])
    })

    test("the bots of the run played by a smart AI → none changed", () => {
        const { run } = ruled(MOVES_RULE)
        run.bot = aiNamed("smart2", new Rng(1), 0)
        const { on, foe } = facing()
        run.playBattle(on)
        expect(foe.unlimited).toEqual([])
    })

    test("strip rules → the steps and the path cards out of the deck, the cards holding them left", () => {
        const { run } = ruled(STRIP_STEP_RULE, STRIP_PATH_RULE)
        const { on, foe } = facing()
        run.playBattle(on)
        expect(pile(foe)).toHaveLength(2)
        expect(pile(foe)).toContain(SLASH)
        expect(pile(foe)).toContain(PURSUIT)
    })

    test("shuffle rule → the deck no longer kept in order, the same cards in it", () => {
        const { run } = ruled(SHUFFLE_RULE)
        const { on, foe } = facing()
        run.playBattle(on)
        expect(foe.stats.ordered.value).toBe(false)
        expect(pile(foe)).toHaveLength(DECK.length)
        for(const card of DECK) expect(pile(foe)).toContain(card)
    })

    test("moves rule on a unit already playing them → each card once", () => {
        const { run } = ruled(MOVES_RULE)
        const { on, foe } = facing()
        foe.grantUnlimited([STEP])
        run.playBattle(on)
        expect(foe.unlimited).toHaveLength(UNLIMITED_CARDS.length)
    })

    test("smart rule → each target played by an AI of its own", () => {
        const { run } = ruled(smartRule("smart2"))
        const { on, hero, foe } = facing()
        const other = monster(on, 5)
        run.playBattle(on)
        expect(foe.controller).toBeInstanceOf(LookaheadAi)
        expect(other.controller).toBeInstanceOf(LookaheadAi)
        expect(other.controller).not.toBe(foe.controller)
        expect(hero.controller).toBe("player")
        expect(on.bot).toBeInstanceOf(DeckAi)
    })

    test("all rules → the targets picked before the AI makes them smart, each rule applied to them", () => {
        const { run } = ruled(smartRule("smart2"), ...allRules("smart2"))
        const { on, foe } = facing()
        run.playBattle(on)
        expect(foe.controller).toBeInstanceOf(LookaheadAi)
        expect(foe.unlimited).toEqual(UNLIMITED_CARDS)
        expect(foe.stats.ordered.value).toBe(false)
        expect(pile(foe)).toHaveLength(2)
    })

    test("all rules, then a round → the AI plans it, and the battle plays it", () => {
        const { run } = ruled(...allRules())
        const { on, hero, foe } = facing()
        run.playBattle(on)
        on.startRound()
        on.commit(hero)
        on.advance()
        expect(on.round).toBe(1)
        expect(foe.controller).toBeInstanceOf(LookaheadAi)
        expect(on.events.filter(event => event.type === "error")).toEqual([])
    })

    test("a copy of a changed battle → the cards unlimited and the deck kept", () => {
        const { run } = ruled(...allRules("smart2"))
        const { on, foe } = facing()
        run.playBattle(on)
        const copy = on.clone().units[on.units.indexOf(foe)]
        expect(copy.unlimited).toEqual(UNLIMITED_CARDS)
        expect(copy.stats.ordered.value).toBe(false)
        expect(pile(copy)).toEqual(pile(foe))
    })

    test("another run → its battles changed by the same rules, those of the one before no more", () => {
        const { run, held } = ruled(MOVES_RULE)
        const next = new Run(2)
        held.engine = next
        const first = facing()
        run.playBattle(first.on)
        const second = facing()
        next.playBattle(second.on)
        expect(first.foe.unlimited).toEqual([])
        expect(second.foe.unlimited).toEqual(UNLIMITED_CARDS)
    })

    test("cleared or disposed → the battles left as they are, nothing said", () => {
        const cleared = ruled(MOVES_RULE)
        cleared.held.clear()
        const first = facing()
        cleared.run.playBattle(first.on)
        const disposed = ruled(MOVES_RULE)
        disposed.held.dispose()
        const second = facing()
        disposed.run.playBattle(second.on)
        expect(first.foe.unlimited).toEqual([])
        expect(second.foe.unlimited).toEqual([])
        expect([...cleared.told, ...disposed.told]).toEqual([])
    })
})

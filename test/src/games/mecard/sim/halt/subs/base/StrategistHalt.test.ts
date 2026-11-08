import { describe, expect, test } from "vitest"
import { AIM, Run, STEP, STRATEGIST_HALT, TACTICS_BOOK, THRUST, WAIT } from "@game/core/mecard"
import type { Card, Choosing, Count, Halt, Hero } from "@game/core/mecard"
import type { Text } from "@game/core"
import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A player answering by a list of choices, then the first option, taking the first cards of each ask. */
class Strategy extends ScriptedPlayer {
    constructor(run: Run, public readonly picked: number, answers: number[] = []){
        super(run, () => answers.shift() ?? 0)
    }

    public override cards(
        title: Text, pool: readonly Card[], count: Count, done: (cards: Card[]) => void,
        pick: Choosing<Card> = {},
    ): void {
        super.cards(title, pool, { min: Math.min(this.picked, pool.length), max: count.max }, done, pick)
    }
}

/** A run whose first hero holds some decks, alone in its party. */
function holding(...decks: Card[][]): { run: Run, hero: Hero } {
    const run = startedRun(1)
    const [hero] = run.heroes
    run.heroes.splice(1)
    hero.decks.splice(0, hero.decks.length, ...decks)
    return { run, hero }
}

/** Visit the strategist, answering every dialog. */
function visit(run: Run, picked: number, answers: number[] = []): Halt {
    const halt = STRATEGIST_HALT.create(run)
    const player = new Strategy(run, picked, answers)
    halt.start(player)
    player.play()
    return halt
}

/** The answers choosing to sort: the hero, then the second plan. */
const SORT = [0, 1]

// --- Tests ---

describe("StrategistHalt, a new deck", () => {
    test("one deck → cut in two, then cards swapped", () => {
        const { run, hero } = holding([STEP, STEP, AIM, AIM, THRUST])
        const halt = visit(run, 1)
        expect(hero.decks.map(deck => deck.length).sort()).toEqual([2, 3])
        const cards = [STEP, STEP, AIM, AIM, THRUST]
        expect(hero.decks.flat().map(String).sort()).toEqual(cards.map(String).sort())
        expect(halt.hasImpact).toBe(true)
    })

    test("a deck cut → the two halves shown before the swap", () => {
        const { run } = holding([STEP, AIM])
        const player = new Strategy(run, 0)
        STRATEGIST_HALT.create(run).start(player)
        player.play()
        const halves = player.log.findIndex(line => line.includes("Le deck est divisé"))
        const swap = player.log.findIndex(line => line.includes("à échanger"))
        expect(halves).toBeGreaterThanOrEqual(0)
        expect(player.log[halves]).toMatch(/Deck violet \[\S+\]/)
        expect(player.log[halves]).toMatch(/Deck rouge \[\S+\]/)
        expect(swap).toBeGreaterThan(halves)
    })

    test("nothing swapped → still cut, an impact", () => {
        const { run, hero } = holding([STEP, AIM])
        expect(visit(run, 0).hasImpact).toBe(true)
        expect(hero.decks.map(deck => deck.length)).toEqual([1, 1])
    })

    test("a deck of one card alone → only the item is left to take", () => {
        const { run, hero } = holding([STEP])
        expect(visit(run, 1).hasImpact).toBe(true)
        expect(hero.decks).toEqual([[STEP]])
        expect(hero.items).toContain(TACTICS_BOOK)
    })
})

describe("StrategistHalt, drawing more", () => {
    test("the item taken → given for free, the decks left alone", () => {
        const { run, hero } = holding([STEP, AIM], [THRUST, WAIT])
        const gold = run.gold
        expect(visit(run, 1, [0, 3]).hasImpact).toBe(true)
        expect(hero.items).toContain(TACTICS_BOOK)
        expect(run.gold).toBe(gold)
        expect(hero.decks).toEqual([[STEP, AIM], [THRUST, WAIT]])
    })
})

describe("StrategistHalt, joining", () => {
    test("two decks → one, shown, then something else asked", () => {
        const { run, hero } = holding([STEP, AIM], [THRUST])
        const player = new Strategy(run, 0, [0, 2, 1])
        const halt = STRATEGIST_HALT.create(run)
        halt.start(player)
        player.play()
        expect(hero.decks).toEqual([[STEP, AIM, THRUST]])
        expect(hero.items).toContain(TACTICS_BOOK)
        expect(halt.hasImpact).toBe(true)
        const told = player.log.find(line => line.startsWith("confirm: Les deux"))
        expect(told).toContain(`Deck [${STEP.name}, ${AIM.name}, ${THRUST.name}]`)
    })

    test("three decks → the two chosen, the other left alone, then something else asked", () => {
        const { run, hero } = holding([STEP], [THRUST], [WAIT])
        // Nothing to cut: the plans are sorting, joining, drawing. The second and third decks are joined.
        visit(run, 0, [0, 1, 1, 1, 3])
        expect(hero.decks).toEqual([[STEP], [THRUST, WAIT]])
        expect(hero.items).toContain(TACTICS_BOOK)
    })

    test("the decks joined, the plans asked again → the deck can be cut", () => {
        const { run, hero } = holding([STEP], [THRUST])
        visit(run, 0, [0, 1, 0])
        expect(hero.decks.map(deck => deck.length)).toEqual([1, 1])
    })
})

describe("StrategistHalt, sorting", () => {
    test("cards swapped → the two decks shown as they now are", () => {
        const { run } = holding([STEP, AIM], [THRUST, WAIT])
        const player = new Strategy(run, 1, [...SORT])
        STRATEGIST_HALT.create(run).start(player)
        player.play()
        const told = player.log.find(line => line.startsWith("tell: Échangées"))
        expect(told).toContain(`Deck violet [${AIM.name}, ${THRUST.name}]`)
        expect(told).toContain(`Deck rouge [${WAIT.name}, ${STEP.name}]`)
    })

    test("two decks → the first cards of each swapped", () => {
        const { run, hero } = holding([STEP, AIM], [THRUST, WAIT])
        expect(visit(run, 1, [...SORT]).hasImpact).toBe(true)
        expect(hero.decks).toEqual([[AIM, THRUST], [WAIT, STEP]])
    })

    test("nothing picked → nothing changed, no impact", () => {
        const { run, hero } = holding([STEP, AIM], [THRUST, WAIT])
        expect(visit(run, 0, [...SORT]).hasImpact).toBe(false)
        expect(hero.decks).toEqual([[STEP, AIM], [THRUST, WAIT]])
    })

    test("three decks → the two chosen, the other left alone", () => {
        const { run, hero } = holding([STEP], [THRUST], [WAIT])
        // Nothing to cut: the plan of sorting comes first.
        expect(visit(run, 1, [0, 0]).hasImpact).toBe(true)
        expect(hero.decks).toEqual([[THRUST], [STEP], [WAIT]])
    })
})

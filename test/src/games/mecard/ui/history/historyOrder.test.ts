import { describe, expect, test } from "vitest"
import { HISTORY_VERSION } from "@game/core-src/games/mecard/sim/save/historySave"
import type { HistoryEntry } from "@game/core-src/games/mecard/sim/save/historySave"
import { deckOfCard, epitaph, formatStep } from "@game/core/mecard/history-format"
import { medalsOf, sortedAndFiltered } from "@game/core/mecard/history-order"

// --- Fixture builders ---

/** A game of the history, the fields not given being those of a plain one. */
function entry(fields: Partial<HistoryEntry> = {}): HistoryEntry {
    return { version: HISTORY_VERSION, date: 1, seed: 1, depth: 1, floor: "Grotte", gold: 0, heroes: [], ...fields }
}

const ROUTE = { layers: [{ kind: "fight", taken: true }, { kind: "halt", taken: true }], fallAt: 1 } as const

// --- Tests ---

describe("sortedAndFiltered", () => {
    test("recent mode → the games stay as given", () => {
        const games = [entry({ gold: 1 }), entry({ gold: 2 })]
        expect(sortedAndFiltered(games, "recent", null)).toEqual(games)
    })

    test("richest mode → the most gold first", () => {
        const games = [entry({ gold: 1 }), entry({ gold: 5 }), entry({ gold: 3 })]
        expect(sortedAndFiltered(games, "richest", null).map(game => game.gold)).toEqual([5, 3, 1])
    })

    test("deepest mode → the highest floor first, then the row fallen on", () => {
        const games = [
            entry({ floorNumber: 2, gold: 1 }),
            entry({ floorNumber: 3, gold: 2, route: { ...ROUTE, fallAt: 0 } }),
            entry({ floorNumber: 3, gold: 3, route: ROUTE }),
        ]
        expect(sortedAndFiltered(games, "deepest", null).map(game => game.gold)).toEqual([3, 2, 1])
    })

    test("a floor filter → only the games that ended on it", () => {
        const games = [entry({ floor: "Grotte" }), entry({ floor: "Forêt" })]
        expect(sortedAndFiltered(games, "recent", "Forêt")).toEqual([games[1]])
    })
})

describe("medalsOf", () => {
    test("several games → the deepest and the richest get their medal", () => {
        const deep = entry({ date: 1, floorNumber: 5, gold: 1 })
        const rich = entry({ date: 2, floorNumber: 1, gold: 90 })
        const medals = medalsOf([deep, rich])
        expect(medals.get(deep)).toEqual(["deepest"])
        expect(medals.get(rich)).toEqual(["richest"])
    })

    test("a tie → the oldest game keeps the medal", () => {
        const first = entry({ date: 1, gold: 10 })
        const second = entry({ date: 2, gold: 10 })
        expect(medalsOf([second, first]).get(first)).toContain("richest")
        expect(medalsOf([second, first]).get(second)).toBeUndefined()
    })
})

describe("deckOfCard", () => {
    const card = (name: string) => ({ name }) as never
    const hero = (...decks: unknown[][]) => ({ decks }) as never

    test("a card of a single deck → that deck", () => {
        const a = card("a")
        expect(deckOfCard(hero([card("b")], [a]), a)).toBe(1)
    })

    test("a card in two decks → the deck it is the most in", () => {
        const a = card("a")
        expect(deckOfCard(hero([a], [a, a]), a)).toBe(1)
    })

    test("a card as much in two decks, or in none → the first deck", () => {
        const a = card("a")
        expect(deckOfCard(hero([a], [a]), a)).toBe(0)
        expect(deckOfCard(hero([card("b")], [card("c")]), a)).toBe(0)
    })
})

describe("epitaph and step", () => {
    test("a game that told its fight → the same sentence naming it each time", () => {
        const game = entry({ seed: 7, fight: "Gobelins", route: ROUTE })
        expect(epitaph(game)).toBe(epitaph(game))
        expect(epitaph(game)).toContain("Gobelins")
    })

    test("a game that did not tell its fight → no epitaph", () => {
        expect(epitaph(entry())).toBeNull()
    })

    test("a route → the step is the row fallen on out of the rows", () => {
        expect(formatStep(entry({ route: ROUTE }))).toBe("étape 2 de 2")
        expect(formatStep(entry())).toBeNull()
    })
})

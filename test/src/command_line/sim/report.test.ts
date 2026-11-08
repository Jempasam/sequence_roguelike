import { describe, expect, test } from "vitest"
import { arranged, emptyTally, render, UsageError } from "@game/command_line/sim"
import type { Matrix, Presentation, Tally } from "@game/command_line/sim"

// --- Fixture builders ---

/** A tally of wins and losses. */
function tally(wins: number, losses: number): Tally {
    return { ...emptyTally(), wins, losses, rounds: 10 * (wins + losses) }
}

/** Three fighters on two outputs and a total, the weakest first, one cell that makes no sense. */
const MATRIX: Matrix = {
    title: null,
    rows: ["Faible", "Fort", "Moyen"],
    columns: ["solo", "total"],
    cells: [
        [tally(1, 9), tally(2, 18)],
        [tally(9, 1), tally(18, 2)],
        [null, tally(10, 10)],
    ],
}

const PRESENTATION: Presentation = { show: [], sort: null, top: null, flip: false, format: "table" }

// --- Tests ---

describe("arranged", () => {
    test("no sort asked → the strongest by the total first", () => {
        expect(arranged(MATRIX, PRESENTATION).rows).toEqual(["Fort", "Moyen", "Faible"])
    })

    test("a column → the strongest of that column first, a cell that makes no sense last", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, sort: "solo" }).rows).toEqual(["Fort", "Faible", "Moyen"])
    })

    test("name → alphabetical", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, sort: "name" }).rows).toEqual(["Faible", "Fort", "Moyen"])
    })

    test("top K → the first K rows, and a negative K → the last K", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, top: 2 }).rows).toEqual(["Fort", "Moyen"])
        expect(arranged(MATRIX, { ...PRESENTATION, top: -1 }).rows).toEqual(["Faible"])
    })

    test("flip → the outputs become the rows, sorted by the first column", () => {
        const flipped = arranged(MATRIX, { ...PRESENTATION, flip: true })
        expect(flipped.columns).toEqual(["Faible", "Fort", "Moyen"])
        expect([...flipped.rows].sort()).toEqual(["solo", "total"])
        expect(flipped.cells.flat().filter(cell => cell === null)).toHaveLength(1)
    })

    test("a column that does not exist → told with the columns", () => {
        expect(() => arranged(MATRIX, { ...PRESENTATION, sort: "cave" })).toThrow(UsageError)
        expect(() => arranged(MATRIX, { ...PRESENTATION, sort: "cave" })).toThrow("Colonnes : name, solo, total.")
    })
})

describe("render", () => {
    test("a table → the winrates in aligned columns, a dash where a cell makes no sense", () => {
        const lines = render([MATRIX], PRESENTATION).split("\n")
        expect(lines[0].trim().split(/\s+/)).toEqual(["solo", "total"])
        expect(lines[2].startsWith("Fort")).toBe(true)
        expect(lines[2]).toContain("90.0%")
        expect(lines.find(line => line.startsWith("Moyen"))).toMatch(/Moyen\s+-\s+50\.0%/)
        expect(new Set(lines.filter(line => line !== "").map(line => line.length)).size).toBe(1)
    })

    test("show → the fields named follow the winrate", () => {
        const text = render([MATRIX], { ...PRESENTATION, show: ["n", "ci", "draws", "timeouts", "rounds", "errors"] })
        expect(text).toMatch(/90\.0% n=10 ±\d+\.\d nuls=0 timeouts=0 rounds=10\.0 errors=0/)
    })

    test("show wins → the total of wins and those the soft win gave, the same for the losses", () => {
        const soft: Matrix = {
            title: null, rows: ["Kit"], columns: ["solo"],
            cells: [[{ ...emptyTally(), wins: 7, softWins: 3, losses: 2, softLosses: 1 }]],
        }
        const text = render([soft], { ...PRESENTATION, show: ["wins", "softwins", "losses", "softlosses"] })
        expect(text).toContain("wins=7 softwins=3 losses=2 softlosses=1")
    })

    test("several tables → each under its title", () => {
        const text = render([{ ...MATRIX, title: "IA : deck" }, { ...MATRIX, title: "IA : random" }], PRESENTATION)
        expect(text).toContain("# IA : deck")
        expect(text).toContain("# IA : random")
    })

    test("csv → a header and a line each, the winrate then the fields, empty where a cell makes no sense", () => {
        const lines = render([MATRIX], { ...PRESENTATION, format: "csv", show: ["n"] }).split("\n")
        expect(lines[0]).toBe("nom,solo,solo n,total,total n")
        expect(lines[1]).toBe("Fort,90.0,10,90.0,20")
        expect(lines.find(line => line.startsWith("Moyen"))).toBe("Moyen,,,50.0,20")
    })

    test("json → the cells with their counts, none where a cell makes no sense", () => {
        const parsed = JSON.parse(render([MATRIX], { ...PRESENTATION, format: "json" })) as {
            columns: string[], rows: { name: string, cells: ({ winrate: number, wins: number }|null)[] }[]
        }
        expect(parsed.columns).toEqual(["solo", "total"])
        expect(parsed.rows[0].name).toBe("Fort")
        expect(parsed.rows[0].cells[0]?.winrate).toBeCloseTo(0.9)
        expect(parsed.rows[1].cells[1]?.wins).toBe(10)
        expect(parsed.rows[1].name).toBe("Moyen")
        expect(parsed.rows[1].cells[0]).toBeNull()
    })
})

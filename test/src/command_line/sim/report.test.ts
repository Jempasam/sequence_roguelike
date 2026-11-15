import { describe, expect, test } from "vitest"
import { arranged, emptyTally, render, UsageError } from "@game/command_line/sim"
import type { Matrix, Presentation, Tally } from "@game/command_line/sim"

// --- Fixture builders ---

/** A tally of wins and losses. */
function tally(wins: number, losses: number): Tally {
    return { ...emptyTally(), wins, losses, rounds: 10 * (wins + losses) }
}

/** Three rows, the weakest first. */
const MATRIX: Matrix = {
    title: null,
    rows: ["Faible", "Fort", "Moyen"],
    tallies: [tally(1, 9), tally(9, 1), tally(10, 10)],
}

const PRESENTATION: Presentation = { columns: ["winrate"], total: false, sort: null, top: null, flip: false, format: "table" }

// --- Tests ---

describe("arranged", () => {
    test("no sort asked → the strongest by the first column first", () => {
        expect(arranged(MATRIX, PRESENTATION).rows).toEqual(["Fort", "Moyen", "Faible"])
    })

    test("a column → the rows by that column, the highest first", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, columns: ["winrate", "n"], sort: "n" }).rows).toEqual(["Moyen", "Faible", "Fort"])
    })

    test("name → alphabetical", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, sort: "name" }).rows).toEqual(["Faible", "Fort", "Moyen"])
    })

    test("top K → the first K rows, and a negative K → the last K", () => {
        expect(arranged(MATRIX, { ...PRESENTATION, top: 2 }).rows).toEqual(["Fort", "Moyen"])
        expect(arranged(MATRIX, { ...PRESENTATION, top: -1 }).rows).toEqual(["Faible"])
    })

    test("a column that does not exist → told with the columns", () => {
        expect(() => arranged(MATRIX, { ...PRESENTATION, sort: "rounds" })).toThrow(UsageError)
        expect(() => arranged(MATRIX, { ...PRESENTATION, sort: "rounds" })).toThrow("Colonnes : name, winrate.")
    })
})

describe("render", () => {
    test("a table → a column for each statistic, in aligned columns", () => {
        const lines = render([MATRIX], { ...PRESENTATION, columns: ["winrate", "n", "rounds"] }).split("\n")
        expect(lines[0].trim().split(/\s+/)).toEqual(["winrate", "n", "rounds"])
        expect(lines[2]).toMatch(/^Fort\s+90\.0%\s+10\s+10\.0$/)
        expect(new Set(lines.filter(line => line !== "").map(line => line.length)).size).toBe(1)
    })

    test("ci, draws and timeouts → written as numbers", () => {
        const text = render([MATRIX], { ...PRESENTATION, columns: ["ci", "draws", "timeouts", "errors"] })
        expect(text).toMatch(/Fort\s+±\d+\.\d\s+0\s+0\s+0/)
    })

    test("wins → the total of wins and those the soft win gave, the same for the losses", () => {
        const soft: Matrix = {
            title: null, rows: ["Kit"],
            tallies: [{ ...emptyTally(), wins: 7, softWins: 3, losses: 2, softLosses: 1 }],
        }
        const text = render([soft], { ...PRESENTATION, columns: ["wins", "softwins", "losses", "softlosses"] })
        expect(text.split("\n")[2]).toMatch(/^Kit\s+7\s+3\s+2\s+1$/)
    })

    test("total → a last row with every battle, out of the sort and the top", () => {
        const lines = render([MATRIX], { ...PRESENTATION, total: true, top: 1, columns: ["winrate", "n"] }).split("\n")
        expect(lines.slice(2).map(line => line.split(/\s+/)[0])).toEqual(["Fort", "total"])
        expect(lines[lines.length - 1]).toMatch(/^total\s+50\.0%\s+40$/)
    })

    test("flip → the statistics become the rows, the rows of the table the columns", () => {
        const lines = render([MATRIX], { ...PRESENTATION, flip: true, columns: ["winrate", "n"] }).split("\n")
        expect(lines[0].trim().split(/\s+/)).toEqual(["Fort", "Moyen", "Faible"])
        expect(lines[2]).toMatch(/^winrate\s+90\.0%\s+50\.0%\s+10\.0%$/)
        expect(lines[3]).toMatch(/^n\s+10\s+20\s+10$/)
    })

    test("several tables → each under its title", () => {
        const text = render([{ ...MATRIX, title: "IA : deck" }, { ...MATRIX, title: "IA : random" }], PRESENTATION)
        expect(text).toContain("# IA : deck")
        expect(text).toContain("# IA : random")
    })

    test("csv → a header and a line each, the numbers bare", () => {
        const lines = render([MATRIX], { ...PRESENTATION, format: "csv", columns: ["winrate", "n"] }).split("\n")
        expect(lines[0]).toBe("nom,winrate,n")
        expect(lines[1]).toBe("Fort,90.0,10")
    })

    test("json → the statistics asked, and the counts of the battles", () => {
        const parsed = JSON.parse(render([MATRIX], { ...PRESENTATION, format: "json", columns: ["winrate", "rounds"] })) as {
            columns: string[], rows: { name: string, cells: (number|null)[], detail: { wins: number, battles: number } }[]
        }
        expect(parsed.columns).toEqual(["winrate", "rounds"])
        expect(parsed.rows[0].name).toBe("Fort")
        expect(parsed.rows[0].cells[0]).toBeCloseTo(0.9)
        expect(parsed.rows[1]).toMatchObject({ name: "Moyen", detail: { wins: 10, battles: 20 } })
    })
})

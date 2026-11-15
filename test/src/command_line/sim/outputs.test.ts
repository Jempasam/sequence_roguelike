import { describe, expect, test } from "vitest"
import { parseOutputs, UsageError } from "@game/command_line/sim"

// --- Fixture builders ---

/** What parsing an `--out` says when it refuses it. */
function refused(...items: string[]): string {
    try {
        parseOutputs(items)
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The outputs were accepted.")
}

// --- Tests ---

describe("parseOutputs", () => {
    test("columns → the statistics asked, in the order given", () => {
        expect(parseOutputs(["rounds", "winrate", "n"])).toEqual({ columns: ["rounds", "winrate", "n"], total: false })
    })

    test("total → a general output, wherever it stands, that adds no column", () => {
        expect(parseOutputs(["total", "winrate"])).toEqual({ columns: ["winrate"], total: true })
        expect(parseOutputs(["winrate", "wins", "softwins", "losses", "softlosses", "total"]).columns)
            .toEqual(["winrate", "wins", "softwins", "losses", "softlosses"])
    })

    test("case and accents → ignored", () => {
        expect(parseOutputs(["Winrate", "N"]).columns).toEqual(["winrate", "n"])
    })

    test("what is wrong → told with what exists", () => {
        expect(refused("winrat")).toContain("Vouliez-vous « winrate »")
        expect(refused("solo/cave")).toContain("Colonnes : winrate, n, ci")
        expect(refused("n", "n")).toContain("« n » est demandé deux fois")
        expect(refused("total", "total", "n")).toContain("« total » est demandé deux fois")
        expect(refused("total")).toContain("aucune colonne")
    })
})

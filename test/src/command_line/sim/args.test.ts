import { describe, expect, test } from "vitest"
import { choiceOf, integerOf, listOf, parseArgs, UsageError, valueOf, valuesOf } from "@game/command_line/sim"
import type { OptionSpec } from "@game/command_line/sim"

// --- Fixture builders ---

const SPECS: readonly OptionSpec[] = [
    { name: "games" },
    { name: "def", repeatable: true },
    { name: "quiet", flag: true },
    { name: "top" },
]

// --- Tests ---

describe("parseArgs", () => {
    test("`--name value` and `--name=value` → the same value", () => {
        expect(valueOf(parseArgs(["--games", "5"], SPECS), "games")).toBe("5")
        expect(valueOf(parseArgs(["--games=5"], SPECS), "games")).toBe("5")
    })

    test("a flag → set, and takes no value", () => {
        expect(parseArgs(["--quiet"], SPECS).values.has("quiet")).toBe(true)
        expect(() => parseArgs(["--quiet=yes"], SPECS)).toThrow(/ne prend pas de valeur/)
    })

    test("a repeatable option → every value in order", () => {
        expect(valuesOf(parseArgs(["--def", "a=Avancer", "--def", "b=Estoc"], SPECS), "def")).toEqual(["a=Avancer", "b=Estoc"])
    })

    test("a negative number → a value, not an option", () => {
        expect(valueOf(parseArgs(["--top", "-5"], SPECS), "top")).toBe("-5")
    })

    test("an unknown option → the nearest one is suggested", () => {
        expect(() => parseArgs(["--gmaes", "5"], SPECS)).toThrow("Option inconnue --gmaes, vouliez-vous --games ?")
    })

    test("an option with nothing after it → told", () => {
        expect(() => parseArgs(["--games"], SPECS)).toThrow("--games attend une valeur.")
        expect(() => parseArgs(["--games", "--quiet"], SPECS)).toThrow("--games attend une valeur.")
    })

    test("an option given twice → told, unless it is repeatable", () => {
        expect(() => parseArgs(["--games", "1", "--games", "2"], SPECS)).toThrow("--games est donné deux fois.")
    })

    test("a word that is no option → told", () => {
        expect(() => parseArgs(["Lancier"], SPECS)).toThrow(UsageError)
    })
})

describe("listOf", () => {
    test("values with commas → a list, spaces trimmed", () => {
        expect(listOf("a, b ,c", "--x")).toEqual(["a", "b", "c"])
    })

    test("an empty value → told with the option", () => {
        expect(() => listOf("a,,b", "--x")).toThrow("--x : liste invalide")
    })
})

describe("integerOf", () => {
    test("a number in range → the number", () => {
        expect(integerOf("7", "--games", 1)).toBe(7)
        expect(integerOf("-3", "--top", -10, 10)).toBe(-3)
    })

    test("not a whole number → told with what was received", () => {
        expect(() => integerOf("abc", "--games", 1)).toThrow("--games : entier attendu, reçu « abc ».")
        expect(() => integerOf("1.5", "--games", 1)).toThrow(UsageError)
    })

    test("out of range → told with the range", () => {
        expect(() => integerOf("0", "--games", 1)).toThrow("--games : 0 hors limites (entier ≥ 1 attendu).")
        expect(() => integerOf("7", "--team", 1, 6)).toThrow("--team : 7 hors limites (entier entre 1 et 6 attendu).")
    })
})

describe("choiceOf", () => {
    test("a word of the list → the word", () => {
        expect(choiceOf("csv", "--format", ["table", "csv"])).toBe("csv")
    })

    test("another word → the words allowed", () => {
        expect(() => choiceOf("xml", "--format", ["table", "csv"])).toThrow("Valeurs permises : table, csv.")
    })
})

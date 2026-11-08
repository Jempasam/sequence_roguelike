import { describe, expect, test } from "vitest"
import { closest, normalize, unknownName } from "@game/command_line/sim"

// --- Tests ---

describe("normalize", () => {
    test("case, accents and spaces → ignored", () => {
        expect(normalize("  Épéiste  ")).toBe("epeiste")
        expect(normalize("Coup   d'épée")).toBe("coup d'epee")
    })
})

describe("closest", () => {
    const names = ["Lancier", "Épéiste", "Archère", "Mage"]

    test("a typo → the name it looks like", () => {
        expect(closest("Lancer", names)).toEqual(["Lancier"])
        expect(closest("archere", names)).toEqual(["Archère"])
    })

    test("a part of a name → that name", () => {
        expect(closest("epe", names)).toContain("Épéiste")
    })

    test("nothing alike → none", () => {
        expect(closest("zzzzzzzz", names)).toEqual([])
    })

    test("at most three, the closest first", () => {
        expect(closest("Mag", ["Mage", "Magi", "Magu", "Magx", "Zzz"]).length).toBe(3)
    })
})

describe("unknownName", () => {
    test("a typo → the question « Vouliez-vous »", () => {
        expect(unknownName("combattant", "Lancer", ["Lancier", "Mage"]).message)
            .toBe("Nom inconnu « Lancer » (combattant). Vouliez-vous « Lancier » ?")
    })

    test("nothing alike → what exists", () => {
        expect(unknownName("carte", "zzzzzzzz", ["Estoc", "Tir"]).message).toBe("Nom inconnu « zzzzzzzz » (carte). Disponibles : Estoc, Tir.")
    })
})

import { describe, expect, test } from "vitest"
import { CONVERT_USAGE, convertCommand } from "@game/command_line/convert"
import { UsageError } from "@game/command_line/sim"

describe("convert", () => {
    test("a monster as a module → the source, the profiles and the result told", () => {
        const text = convertCommand(["monster:Gobelin", "module"])
        expect(text).toContain("# monster:Gobelin -> module:")
        expect(text).toContain("Profils des cartes :")
        expect(text).toContain("Résultat :")
    })

    test("a monster as a fusion → a card named after the unit, with its cards", () => {
        const text = convertCommand(["monster:Gobelin", "fusion"])
        expect(text).toMatch(/-> fusion:.+ de Gobelin/)
        expect(text).toContain("cartes : ")
    })

    test("a monster as a merge → a card named after the unit, with its cards", () => {
        expect(convertCommand(["monster:Gobelin", "merged"])).toMatch(/-> merged:.+ de Gobelin/)
    })

    test("an element for a unit with nothing to give → the result says why, not an error", () => {
        const text = convertCommand(["monster:Gobelin", "element"])
        expect(text).toContain("Résultat :")
        expect(text).toContain("aucun élément possible")
    })

    test("an element for a unit with a negative effect only → the missing side told", () => {
        expect(convertCommand(["monster:Mage de glace", "element"])).toContain("pas d'effet positif")
        expect(convertCommand(["monster:Mage de feu", "element"])).toContain("pas d'effet positif")
        expect(convertCommand(["monster:Mage de feu", "element"])).not.toContain("pas d'effet négatif")
    })

    test("an element → its name is the one of the monster, not its effects", () => {
        const text = convertCommand(["monster:Contrôleur mental", "element"])
        expect(text).toContain("# monster:Contrôleur mental -> element:Contrôleur mental")
    })

    test("the same command twice → the same text", () => {
        const args = ["monster:Gobelin", "fusion"]
        expect(convertCommand(args)).toBe(convertCommand(args))
    })

    test("a source that is only built → refused, the types told", () => {
        expect(() => convertCommand(["fusion:Gobelin", "module"])).toThrow(UsageError)
    })

    test("a target that does not exist → refused, the targets told", () => {
        expect(() => convertCommand(["monster:Gobelin", "dragon"])).toThrow(/fusion/)
    })

    test("the usage → tells the sources and the targets apart", () => {
        expect(CONVERT_USAGE).toContain("Types (sources) :")
        expect(CONVERT_USAGE).toMatch(/Cibles : .*fusion.*merged.*element/)
    })
})

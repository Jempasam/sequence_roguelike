import { describe, expect, test } from "vitest"
import {
    ALL_MONSTERS, ALL_PETS, analysisOf, combineAnatomies, convert, convertMany, FUSION_TARGET, MergedAnalysis,
    MONSTER_KIND, PET_KIND,
} from "@game/core/mecard"

const [first, second] = ALL_MONSTERS
const [pet] = ALL_PETS

describe("convertMany", () => {
    test("one source → exactly what convert gives", () => {
        const one = convertMany([{ kind: MONSTER_KIND, value: first }], PET_KIND)
        const alone = convert(MONSTER_KIND, first, PET_KIND)
        expect(one.name).toBe(alone.name)
        expect(one.cards.map(card => card.name)).toEqual(alone.cards.map(card => card.name))
    })

    test("two sources → named after both, hearts added up", () => {
        const both = convertMany([
            { kind: MONSTER_KIND, value: first }, { kind: MONSTER_KIND, value: second },
        ], MONSTER_KIND)
        expect(both.name).toBe(`${first.name}-${second.name}`)
        expect(both.hearts).toBe(first.hearts + second.hearts)
    })

    test("the same sources → the same result each time", () => {
        const sources = [{ kind: MONSTER_KIND, value: first }, { kind: PET_KIND, value: pet }]
        const one = convertMany(sources, PET_KIND)
        const other = convertMany(sources, PET_KIND)
        expect(one.cards.map(card => card.name)).toEqual(other.cards.map(card => card.name))
    })

    test("two sources → the identity of each, one after the other", () => {
        const anatomies = [MONSTER_KIND.anatomy(first), MONSTER_KIND.anatomy(second)]
        const parts = anatomies.map(analysisOf)
        const merged = new MergedAnalysis(parts, combineAnatomies(anatomies))
        const sizes = MONSTER_KIND.defaults
        const alone = parts.flatMap(part => part.identity(sizes).chosen)
        expect(alone.length).toBeGreaterThan(0)
        expect(merged.identity(sizes).chosen).toEqual(alone)
    })

    test("two sources → a fusion of the identity of each, named after both", () => {
        const sources = [{ kind: MONSTER_KIND, value: first }, { kind: MONSTER_KIND, value: second }]
        const fusion = convertMany(sources, FUSION_TARGET)
        expect(fusion.name).toMatch(new RegExp(` de ${first.name}-${second.name}$`))
        expect(fusion.contents.length).toBeGreaterThanOrEqual(4)
    })

    test("no source → an error that says so", () => {
        expect(() => convertMany([], MONSTER_KIND)).toThrow("at least one source")
    })
})

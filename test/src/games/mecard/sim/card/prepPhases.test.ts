import { describe, expect, test } from "vitest"
import {
    ADAPTATION, AIM, ALL_UPGRADES, BEAST_ARMOR, BITE, BLEED, BLUE_HEART, BOUNCE_DASH, CYBERNETIC_BEAST,
    ELEMENTAL, FIRE, FLESH_CURSE, FusionCard, HAWK_CARD, HYBRIDIZATION, IMPROVISED_WEAPON, MISSILE, phaseOf,
    REPETITION, REVERSED_ADAPTATION, Rng, SLASH, SMALL_SPELL, STEP, THRUST, upgradeMatches, upgraded,
    WOLF_CARD,
} from "@game/core/mecard"
import type { ChainWatcher, Card } from "@game/core/mecard"

import { chain } from "../fixtures"

// --- Fixtures ---

/** The first option of a draw, as a preview takes it. */
const FIRST = { pick: <T>(options: readonly T[]): T => options[0] }

/** The cards of a chain once its preparations are rewritten. */
function rewritten(...cards: Card[]): Card[] {
    const row = chain(...cards)
    row.prepare(FIRST)
    return row.cards
}

/** Which places of a chain a preparation could not be built at, once it is rewritten. */
function invalidPlaces(...cards: Card[]): number[] {
    const row = chain(...cards)
    const invalid: number[] = []
    const watcher: ChainWatcher = {
        activated: () => {}, changed: () => {}, invalid: index => invalid.push(index),
    }
    row.watcher = watcher
    row.prepare(FIRST)
    return invalid
}

/** A card of the upgrades, by its name. */
function upgradeNamed(name: string) {
    const found = ALL_UPGRADES.find(upgrade => upgrade.name === name)
    if(!found) throw new Error(`No upgrade is named ${name}.`)
    return found
}

/** What the cybernetic beast, a fusion of the adaptation with it, makes of a card giving a beast. */
const CYBORG = new FusionCard([ADAPTATION, CYBERNETIC_BEAST, WOLF_CARD])

/** The wolf: its run and its bite, as the beasts of the catalog say. */
const WOLF_BITE = [BLEED, SLASH]

/** What the wolf plays as a body: aiming, running, then biting twice. */
const WOLF_BODY = [AIM, BOUNCE_DASH, BLEED, SLASH, BLEED, SLASH]

// --- Tests ---

describe("the phases of the preparations", () => {
    test("a card taking something → prepless; a card taking nothing, a fusion → prepfull; any other card → none", () => {
        expect(phaseOf(BITE)).toBe("prepless")
        expect(phaseOf(IMPROVISED_WEAPON)).toBe("prepless")
        expect(phaseOf(HYBRIDIZATION)).toBe("prepless")
        expect(phaseOf(REPETITION)).toBe("prepfull")
        expect(phaseOf(ADAPTATION)).toBe("prepfull")
        expect(phaseOf(REVERSED_ADAPTATION)).toBe("prepfull")
        expect(phaseOf(CYBORG)).toBe("prepfull")
        expect(phaseOf(SLASH)).toBeNull()
        expect(phaseOf(WOLF_CARD)).toBeNull()
    })
})

describe("the rewrite in two phases", () => {
    test("a bite and a fusion unfolding to the adaptation → the adaptation takes the conversion off, the bite reads the beast", () => {
        expect(rewritten(BITE, CYBORG)).toEqual(WOLF_BITE)
    })

    test("an improvised weapon and the same fusion → the adaptation goes alone, the weapon reads the module of the beast", () => {
        expect(rewritten(IMPROVISED_WEAPON, CYBORG)).toEqual(WOLF_BODY)
    })

    test("fusions inside a fusion → unfolded all the way down, the same result", () => {
        const nested = new FusionCard([new FusionCard([ADAPTATION, CYBERNETIC_BEAST]), WOLF_CARD])
        expect(rewritten(BITE, nested)).toEqual(WOLF_BITE)
    })

    test("a repetition of a bite, then its beast → the bite copied as written, the first one left without a beast", () => {
        expect(rewritten(REPETITION, BITE, WOLF_CARD)).toEqual([BITE, ...WOLF_BITE])
        expect(invalidPlaces(REPETITION, BITE, WOLF_CARD)).toEqual([0])
    })

    test("a bite, a repetition, a fusion → the fusion copied whole, the first beast read by the bite", () => {
        expect(rewritten(BITE, REPETITION, CYBORG)).toEqual([...WOLF_BITE, WOLF_CARD])
    })

    test("a preparation with no beast → left where it is, told invalid", () => {
        expect(rewritten(BITE)).toEqual([BITE])
        expect(invalidPlaces(BITE)).toEqual([0])
    })

    test("a weapon given a beast, a module wanted → left, told invalid", () => {
        expect(rewritten(IMPROVISED_WEAPON, WOLF_CARD)).toEqual([IMPROVISED_WEAPON, WOLF_CARD])
        expect(invalidPlaces(IMPROVISED_WEAPON, WOLF_CARD)).toEqual([0])
    })

    test("a bite of a bite → the inner bite rewritten first, the outer one finding actions, told invalid", () => {
        expect(rewritten(BITE, BITE, WOLF_CARD)).toEqual([BITE, ...WOLF_BITE])
        expect(invalidPlaces(BITE, BITE, WOLF_CARD)).toEqual([0])
    })

    test("a repetition of a repetition → ends: what a card gave is never rewritten again by it, and is dropped", () => {
        expect(rewritten(REPETITION, REPETITION, STEP)).toEqual([STEP])
    })
})

describe("the adaptations", () => {
    test("the module of a beast for a card wanting a beast → the conversion goes, the beast stays", () => {
        expect(rewritten(BITE, ADAPTATION, CYBERNETIC_BEAST, WOLF_CARD)).toEqual(WOLF_BITE)
    })

    test("alone, with no card on its left → what is on its right goes with it", () => {
        expect(rewritten(ADAPTATION, CYBERNETIC_BEAST, WOLF_CARD)).toEqual([WOLF_CARD])
    })

    test("nothing on its right → it goes alone, the card on its left stays", () => {
        expect(rewritten(STEP, ADAPTATION)).toEqual([STEP])
    })

    test("reversed, an element given to the card wanting it → it goes alone, an elemental takes the element", () => {
        const mastery = new FusionCard([BITE, ELEMENTAL, REVERSED_ADAPTATION])
        expect(rewritten(mastery, FIRE)).toEqual([SMALL_SPELL, FIRE])
    })

    test("reversed, a beast given instead → the elemental goes with it, the beast is read", () => {
        const mastery = new FusionCard([BITE, ELEMENTAL, REVERSED_ADAPTATION])
        expect(rewritten(mastery, WOLF_CARD)).toEqual(WOLF_BITE)
    })

    test("reversed, nothing on its right → the elemental goes with it, the bite is left without a beast", () => {
        const mastery = new FusionCard([BITE, ELEMENTAL, REVERSED_ADAPTATION])
        expect(rewritten(mastery)).toEqual([BITE])
        expect(invalidPlaces(mastery)).toEqual([0])
    })
})

describe("the new cards of the beasts", () => {
    test("a hybrid of two beasts → the body of the first, the run and the bite of the second", () => {
        // The wolf body, the hawk run and bite: a bite of it is the bite of the hawk.
        expect(rewritten(BITE, HYBRIDIZATION, WOLF_CARD, HAWK_CARD)).toEqual(HAWK_CARD.beast.bite)
    })

    test("a hybrid of three beasts → the body of the first, the run of the second, the bite of the third", () => {
        const third = WOLF_CARD
        expect(rewritten(BITE, HYBRIDIZATION, HAWK_CARD, WOLF_CARD, third)).toEqual(WOLF_BITE)
    })

    test("one beast alone → the card goes, the beast stays", () => {
        expect(rewritten(HYBRIDIZATION, WOLF_CARD)).toEqual([WOLF_CARD])
    })

    test("the hybrid of beasts of the same chain → two hybridizations, the one on the right first", () => {
        const row = [BITE, HYBRIDIZATION, HAWK_CARD, HYBRIDIZATION, WOLF_CARD, WOLF_CARD]
        expect(rewritten(...row)).toEqual(WOLF_BITE)
    })

    test("the cybernetic beast → the cards its body plays, its run and its bite in their places", () => {
        const module = CYBERNETIC_BEAST.get(WOLF_CARD.beast)
        expect(module.cards(options => options[0])).toEqual(WOLF_BODY)
    })

    test("the flesh curse → a beast that runs a step, does not bite, and has the cards of the module as a body", () => {
        const beast = FLESH_CURSE.get(MISSILE.get())
        expect(beast.run).toEqual([STEP])
        expect(beast.bite).toEqual([])
        expect(beast.body).toEqual([STEP, THRUST, STEP, THRUST])
        expect(rewritten(BITE, ADAPTATION, FLESH_CURSE, MISSILE)).toEqual([])
    })

    test("the armor of a beast → three blue hearts more in its blue group, a group added to a body with none", () => {
        const armored = BEAST_ARMOR.get(WOLF_CARD.beast)
        expect(armored.hearts).toEqual([{ kind: BLUE_HEART, count: 7 }])
        const naked = BEAST_ARMOR.get({ ...WOLF_CARD.beast, hearts: [] })
        expect(naked.hearts).toEqual([{ kind: BLUE_HEART, count: 3 }])
    })

    test("the elemental of an element → it bites with a small spell, and puts its aura on itself before it aims", () => {
        const beast = ELEMENTAL.get(FIRE.element)
        expect(beast.name).toBe("Élémentaire de Feu")
        expect(beast.run).toEqual([STEP])
        expect(beast.bite).toEqual([SMALL_SPELL, FIRE])
        expect(beast.hearts).toEqual([{ kind: BLUE_HEART, count: 2 }])
        expect(rewritten(BITE, ELEMENTAL, FIRE)).toEqual([SMALL_SPELL, FIRE])
    })
})

describe("the upgrades of the beasts", () => {
    test("each → it matches the cards it can improve, and no other", () => {
        expect(upgradeMatches(upgradeNamed("Cyborg"), WOLF_CARD)).toBe(true)
        expect(upgradeMatches(upgradeNamed("Cyborg"), MISSILE)).toBe(false)
        expect(upgradeMatches(upgradeNamed("Armure bestiale"), WOLF_CARD)).toBe(true)
        expect(upgradeMatches(upgradeNamed("Armure bestiale"), SLASH)).toBe(false)
        expect(upgradeMatches(upgradeNamed("Circuit biologique"), MISSILE)).toBe(true)
        expect(upgradeMatches(upgradeNamed("Circuit biologique"), WOLF_CARD)).toBe(false)
        expect(upgradeMatches(upgradeNamed("Maîtrise des arcanes"), BITE)).toBe(true)
        expect(upgradeMatches(upgradeNamed("Maîtrise des arcanes"), WOLF_CARD)).toBe(false)
    })

    test("the cyborg of a beast, given to a bite and to a weapon → read as a beast, then as a module", () => {
        const cyborg = upgraded(upgradeNamed("Cyborg"), WOLF_CARD, new Rng(1))
        expect(rewritten(BITE, cyborg)).toEqual(WOLF_BITE)
        expect(rewritten(IMPROVISED_WEAPON, cyborg)).toEqual(WOLF_BODY)
    })

    test("the biological circuit of a module, given to a weapon and to a bite → read as a module, then as a beast", () => {
        const circuit = upgraded(upgradeNamed("Circuit biologique"), MISSILE, new Rng(1))
        expect(rewritten(IMPROVISED_WEAPON, circuit)).toEqual(MISSILE.get().cards(options => options[0]))
        expect(rewritten(BITE, circuit)).toEqual([])
    })

    test("the armor of a beast → read as a beast, with hearts more", () => {
        const armor = upgraded(upgradeNamed("Armure bestiale"), WOLF_CARD, new Rng(1))
        expect(rewritten(BITE, armor)).toEqual(WOLF_BITE)
    })

    test("the mastery of the arcana, given to an element and to a beast", () => {
        const mastery = upgraded(upgradeNamed("Maîtrise des arcanes"), BITE, new Rng(1))
        expect(rewritten(mastery, FIRE)).toEqual([SMALL_SPELL, FIRE])
        expect(rewritten(mastery, HAWK_CARD)).toEqual(HAWK_CARD.beast.bite)
    })
})

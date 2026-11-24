import { describe, expect, test } from "vitest"
import {
    CARD_CODECS, COCAINE, FIRE, FusionCard, GLUE_TUBE, MECHANICAL_CLONE, MergedCard, ModuleCard, SPELL, STEP,
    THRUST, TIME_POCKET, TURNS,
} from "@game/core/mecard"
import type { Battle, Card, Unit, Usable, UsableSlot } from "@game/core/mecard"

import { battle, chain, MONSTERS, unit } from "../fixtures"

/** A unit whose chain is committed and prepared, the execution about to start. */
function committed(...cards: Card[]): { on: Battle, hero: Unit } {
    const on = battle()
    const hero = unit(on, 3, 5, { hand: cards })
    unit(on, 1, 1, { team: MONSTERS })
    on.startRound()
    on.commit(hero, chain(...cards))
    on.endPreparation()
    return { on, hero }
}

/** Use a usable for a unit, as its belt would. */
function use(usable: Usable, on: Battle, hero: Unit): void {
    const slot = { unit: hero, spend: () => {} } as unknown as UsableSlot
    usable.use({ battle: on, unit: hero }, slot)
}

/** The cards a unit is given for good while something is done. */
function givenForGood(on: Battle, hero: Unit, act: () => void): Card[] {
    const given: Card[] = []
    on.onGetCards.add(({ unit: to, cards }) => {
        if(to === hero) given.push(...cards)
    })
    act()
    return given
}

describe("Chain usables", () => {
    test("a mechanical clone → a module playing the chain, given for good", () => {
        const { on, hero } = committed(STEP, THRUST)
        const [module] = givenForGood(on, hero, () => use(MECHANICAL_CLONE, on, hero))
        expect(module).toBeInstanceOf(ModuleCard)
        expect((module as ModuleCard).cards).toEqual([STEP, THRUST])
    })

    test("a tube of glue → a collage of the chain, given for good", () => {
        const { on, hero } = committed(STEP, THRUST)
        const [collage] = givenForGood(on, hero, () => use(GLUE_TUBE, on, hero))
        expect(collage).toBeInstanceOf(FusionCard)
        expect(collage.contents).toEqual([STEP, THRUST])
    })

    test("cocaine → the actions merged two by two, what cannot be merged left as it is", () => {
        const { on, hero } = committed(THRUST, STEP, THRUST, SPELL)
        use(COCAINE, on, hero)
        // The spell and the thrust before it stay apart: a merge of them would take an element, with none after.
        const { cards } = hero.chain
        expect(cards.map(card => card instanceof MergedCard ? card.contents : card)).toEqual([[THRUST, STEP], THRUST, SPELL])
    })

    test("cocaine → a turn merged, though it has variants to choose from in the deck", () => {
        const { on, hero } = committed(TURNS[8], STEP)
        use(COCAINE, on, hero)
        const { cards } = hero.chain
        expect(cards.map(card => card instanceof MergedCard ? card.contents : card)).toEqual([[TURNS[8], STEP]])
    })

    test("cocaine → a pair taking an element merged when an element follows", () => {
        const { on, hero } = committed(THRUST, SPELL, FIRE)
        use(COCAINE, on, hero)
        const { cards } = hero.chain
        expect(cards.map(card => card instanceof MergedCard ? card.contents : card)).toEqual([[THRUST, SPELL], FIRE])
    })

    test("a tube of glue → a turn kept in the collage", () => {
        const { on, hero } = committed(TURNS[8], STEP)
        const [collage] = givenForGood(on, hero, () => use(GLUE_TUBE, on, hero))
        expect(collage.contents).toEqual([TURNS[8], STEP])
    })

    test("cocaine → nothing merged across an element, that does not give actions", () => {
        const { on, hero } = committed(SPELL, FIRE, THRUST, THRUST)
        use(COCAINE, on, hero)
        const { cards } = hero.chain
        expect(cards.map(card => card instanceof MergedCard ? card.contents : card)).toEqual([SPELL, FIRE, [THRUST, THRUST]])
    })

    test("a time pocket → the chain emptied, a fusion of it in hand, for the battle only", () => {
        const { on, hero } = committed(STEP, THRUST)
        const given = givenForGood(on, hero, () => use(TIME_POCKET, on, hero))
        expect(given).toEqual([])
        expect(hero.chain.cards).toEqual([])
        const fusion = hero.hand[hero.hand.length - 1]
        expect(fusion).toBeInstanceOf(FusionCard)
        expect(fusion.contents).toEqual([STEP, THRUST])
    })

    test("a module made in a run → saved and read back, name and cards", () => {
        const module = new ModuleCard("Module cloné", [STEP, new FusionCard([STEP, THRUST])])
        const read = CARD_CODECS.load(CARD_CODECS.save(module)) as ModuleCard
        expect(read).toBeInstanceOf(ModuleCard)
        expect(read.name).toBe("Module cloné")
        expect(read.cards[0]).toBe(STEP)
        expect(read.cards[1].contents).toEqual([STEP, THRUST])
    })
})

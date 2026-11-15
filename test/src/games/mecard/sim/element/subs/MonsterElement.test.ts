import { describe, expect, test } from "vitest"
import {
    AURA, BLUE_HEART, CONJURATION, ELEMENT_CODECS, ElementCard, firstRound, GOBLIN, MonsterElement, POISON_POTION,
    POISONED, Rarity, RITUAL_STATUSES, SMALL_SPELL, soakOf, STATUS_CODECS, VIGOR_POTION, VIGOROUS, Vector2,
    CARD_CODECS, Heart, RED_HEART,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../fixtures"

// --- Fixture builders ---

/** The element of a goblin, poisoning against a unit and strengthening for one. */
const GOBLIN_ELEMENT = new MonsterElement(GOBLIN, POISON_POTION, VIGOR_POTION)

/** The card of that element. */
const GOBLIN_CARD = new ElementCard(GOBLIN_ELEMENT, Rarity.RARE)

/** A hero playing a chain, and a sturdy foe far ahead, so a body called between them has room. */
function cast(...cards: Card[]): { on: ReturnType<typeof battle>, hero: Unit, foe: Unit } {
    const on = battle()
    const hero = unit(on, 3, 5)
    const foe = unit(on, 3, 1, { team: MONSTERS, hearts: Heart.many(RED_HEART, 12), direction: Vector2.DOWN })
    play(on, [[hero, chain(...cards)]])
    return { on, hero, foe }
}

// --- Tests ---

describe("MonsterElement", () => {
    test("its name tells the monster and both potions", () => {
        expect(GOBLIN_ELEMENT.name).toBe(`${GOBLIN.name} (${POISON_POTION.name}/${VIGOR_POTION.name})`)
    })

    test("against a unit → its first potion poured", () => {
        expect(cast(SMALL_SPELL, GOBLIN_CARD).foe.statusOf(POISONED)).toBeDefined()
    })

    test("for a unit → its second potion poured", () => {
        expect(cast(AURA, GOBLIN_CARD).hero.statusOf(VIGOROUS)).toBeDefined()
    })

    test("called → a body of the monster with blue hearts only, soaked with the first potion", () => {
        const { on, hero } = cast(CONJURATION, GOBLIN_CARD)
        const body = on.living.find(each => each !== hero && each.team === hero.team)
        expect(body?.name).toBe(GOBLIN.name)
        expect(body?.hearts.all.every(heart => heart.kind === BLUE_HEART)).toBe(true)
        expect(body?.statusOf(soakOf({ potion: POISON_POTION, sign: 1, factor: 1 }))).toBeDefined()
    })

    test("called → the cards it plays are the first round of the monster", () => {
        expect(firstRound(GOBLIN)).toHaveLength(GOBLIN.draw)
    })
})

describe("what a monster element is saved as", () => {
    test("its card is written down, then found back as the same element", () => {
        const loaded = CARD_CODECS.load(CARD_CODECS.save(GOBLIN_CARD)) as ElementCard
        expect(loaded.element).toBeInstanceOf(MonsterElement)
        expect(loaded.element.name).toBe(GOBLIN_ELEMENT.name)
    })

    test("the element alone is written down, then found back", () => {
        expect(ELEMENT_CODECS.load(ELEMENT_CODECS.save(GOBLIN_ELEMENT)).name).toBe(GOBLIN_ELEMENT.name)
    })

    test("a status made for it → written down, then found back as itself", () => {
        const type = RITUAL_STATUSES.of(GOBLIN_ELEMENT)
        const loadedElement = ELEMENT_CODECS.load(ELEMENT_CODECS.save(GOBLIN_ELEMENT))
        expect(STATUS_CODECS.load(STATUS_CODECS.save(type))).toBe(RITUAL_STATUSES.of(loadedElement))
    })

    test("the soaking of a dose → written down, then found back as itself", () => {
        const type = soakOf({ potion: POISON_POTION, sign: 1, factor: 1 })
        expect(STATUS_CODECS.load(STATUS_CODECS.save(type))).toBe(type)
    })
})

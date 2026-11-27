import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { Rarity } from "@game/core-src/games/mecard/sim/card/Rarity"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import {
    AURA,
    CONJURATION,
    SMALL_SPELL,
} from "@game/core-src/games/mecard/sim/card/subs/spell/ElementActions"
import { ElementCard, FIRE } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { firstRound } from "@game/core-src/games/mecard/sim/catalog/monsterRounds"
import { GOBLIN, monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { HeartsBoon } from "@game/core-src/games/mecard/sim/element/subs/body/HeartsBoon"
import { PotionBoon } from "@game/core-src/games/mecard/sim/element/subs/body/PotionBoon"
import { BodyElement } from "@game/core-src/games/mecard/sim/element/subs/BodyElement"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { SHIELD_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ShieldHeartKind"
import {
    POISON_POTION,
    POTIONS,
    potionOfStatus,
    VIGOR_POTION,
} from "@game/core-src/games/mecard/sim/potion/subs/potions"
import { CARD_CODECS, ELEMENT_CODECS } from "@game/core-src/games/mecard/sim/save/catalogNames"
import { STATUS_CODECS } from "@game/core-src/games/mecard/sim/save/statusCodecs"
import { SOAPY } from "@game/core-src/games/mecard/sim/status/subs/BubbleStatuses"
import { BURN } from "@game/core-src/games/mecard/sim/status/subs/Burn"
import { POISONED } from "@game/core-src/games/mecard/sim/status/subs/Poison"
import { RITUAL_STATUSES } from "@game/core-src/games/mecard/sim/status/subs/RitualStatus"
import { soakOf } from "@game/core-src/games/mecard/sim/status/subs/Soaked"
import { VIGOROUS } from "@game/core-src/games/mecard/sim/status/subs/Vigor"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"

import { battle, chain, MONSTERS, play, unit } from "../../fixtures"

// --- Fixture builders ---

/** The element of a goblin, poisoning against a unit and strengthening for one. */
const GOBLIN_ELEMENT = BodyElement.ofPotions(GOBLIN, POISON_POTION, VIGOR_POTION)

/** The card of that element. */
const GOBLIN_CARD = new ElementCard(GOBLIN_ELEMENT, Rarity.RARE)

/** A body no catalog holds, as an analysis builds one. */
const BUILT = monster({
    name: "Gobelin-Archer", sprite: visual("units/goblin"), hearts: 5, draw: 2, cards: [STEP, THRUST],
})

/** The element of that body, giving two shield hearts for a unit. */
const SHIELDING_ELEMENT = new BodyElement(BUILT, POISON_POTION, new HeartsBoon(SHIELD_HEART, 2))

const SHIELDING_CARD = new ElementCard(SHIELDING_ELEMENT, Rarity.RARE)

/** A hero playing a chain, and a sturdy foe far ahead, so a body called between them has room. */
function cast(...cards: Card[]): { on: ReturnType<typeof battle>, hero: Unit, foe: Unit } {
    const on = battle()
    const hero = unit(on, 3, 5)
    const foe = unit(on, 3, 1, { team: MONSTERS, hearts: Heart.many(RED_HEART, 12), direction: Vector2.DOWN })
    play(on, [[hero, chain(...cards)]])
    return { on, hero, foe }
}

/** How many hearts of a kind a unit holds. */
function heartsOf(who: Unit, kind: Heart["kind"]): number {
    return who.hearts.all.filter(heart => heart.kind === kind).length
}

// --- Tests ---

describe("BodyElement", () => {
    test("its name is the one of the body, its key tells both effects", () => {
        expect(GOBLIN_ELEMENT.name).toBe(GOBLIN.name)
        expect(GOBLIN_ELEMENT.key).toBe(`${GOBLIN.name} (${POISON_POTION.name}/${VIGOR_POTION.name})`)
    })

    test("two bodies of one monster with other effects → other elements, so other statuses made for them", () => {
        const other = BodyElement.ofPotions(GOBLIN, POISON_POTION, potionOfStatus(SOAPY))
        expect(other.name).toBe(GOBLIN_ELEMENT.name)
        expect(other.key).not.toBe(GOBLIN_ELEMENT.key)
        expect(RITUAL_STATUSES.of(other)).not.toBe(RITUAL_STATUSES.of(GOBLIN_ELEMENT))
    })

    test("a base element → its key is its name", () => {
        expect(FIRE.element.key).toBe(FIRE.element.name)
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

    test("called → the body has the potion for a unit too, as it arrives", () => {
        const { on, hero } = cast(CONJURATION, GOBLIN_CARD)
        const body = on.living.find(each => each !== hero && each.team === hero.team)
        expect(body?.statusOf(VIGOROUS)).toBeDefined()
    })
})

describe("a BodyElement of hearts", () => {
    test("its key tells the hearts", () => {
        expect(SHIELDING_ELEMENT.name).toBe(BUILT.name)
        expect(SHIELDING_ELEMENT.key).toBe(`${BUILT.name} (${POISON_POTION.name}/2 cœurs ${SHIELD_HEART.name})`)
    })

    test("for a unit → the hearts of that kind and number given, no potion poured", () => {
        const { hero } = cast(AURA, SHIELDING_CARD)
        expect(heartsOf(hero, SHIELD_HEART)).toBe(2)
        expect(hero.statusOf(VIGOROUS)).toBeUndefined()
    })

    test("called → blue hearts as many as the body has less the one that faded, and the hearts given on top", () => {
        const { on, hero } = cast(CONJURATION, SHIELDING_CARD)
        const body = on.living.find(each => each !== hero && each.team === hero.team)
        expect(body?.name).toBe(BUILT.name)
        expect(heartsOf(body!, BLUE_HEART)).toBe(BUILT.hearts - 1)
        expect(heartsOf(body!, SHIELD_HEART)).toBe(2)
        expect(body?.statusOf(soakOf({ potion: POISON_POTION, sign: 1, factor: 1 }))).toBeDefined()
    })
})

describe("a BodyElement of a status with no potion in the game", () => {
    const BURNING = BodyElement.ofPotions(GOBLIN, potionOfStatus(BURN), potionOfStatus(SOAPY))

    test("against a unit → the status put on it", () => {
        expect(cast(SMALL_SPELL, new ElementCard(BURNING, Rarity.RARE)).foe.statusOf(BURN)).toBeDefined()
    })

    test("called → the body soaked with it, so its blows burn", () => {
        const { on, hero } = cast(CONJURATION, new ElementCard(BURNING, Rarity.RARE))
        const body = on.living.find(each => each !== hero && each.team === hero.team)
        expect(body?.statusOf(soakOf({ potion: potionOfStatus(BURN), sign: 1, factor: 1 }))).toBeDefined()
    })

    test("the potion made for a status → the same one each time, none of the potions of the game", () => {
        expect(potionOfStatus(BURN)).toBe(potionOfStatus(BURN))
        expect(POTIONS).not.toContain(potionOfStatus(BURN))
        expect(potionOfStatus(POISONED)).toBe(POISON_POTION)
    })

    test("written down, then found back with its status, and its soaking too", () => {
        const loaded = ELEMENT_CODECS.load(ELEMENT_CODECS.save(BURNING)) as BodyElement
        expect(loaded.name).toBe(BURNING.name)
        expect(loaded.negative).toBe(potionOfStatus(BURN))
        const soaking = soakOf({ potion: potionOfStatus(BURN), sign: 1, factor: 1 })
        expect(STATUS_CODECS.load(STATUS_CODECS.save(soaking))).toBe(soaking)
    })
})

describe("what an element of a body is saved as", () => {
    test("its card is written down, then found back as the same element", () => {
        const loaded = CARD_CODECS.load(CARD_CODECS.save(GOBLIN_CARD)) as ElementCard
        expect(loaded.element).toBeInstanceOf(BodyElement)
        expect(loaded.element.name).toBe(GOBLIN_ELEMENT.name)
    })

    test("the element alone is written down, then found back", () => {
        expect(ELEMENT_CODECS.load(ELEMENT_CODECS.save(GOBLIN_ELEMENT)).name).toBe(GOBLIN_ELEMENT.name)
    })

    test("a monster of the game and two potions → still written as the first format", () => {
        expect(ELEMENT_CODECS.save(GOBLIN_ELEMENT)).toMatch(/^monster:/)
    })

    test("the first format → still read", () => {
        const old = `monster:${JSON.stringify([GOBLIN.name, POISON_POTION.name, VIGOR_POTION.name])}`
        const loaded = ELEMENT_CODECS.load(old) as BodyElement
        expect(loaded.name).toBe(GOBLIN_ELEMENT.name)
        expect(loaded.positive).toBeInstanceOf(PotionBoon)
    })

    test("a body of an analysis with hearts → written whole, then found back with its body and hearts", () => {
        const text = ELEMENT_CODECS.save(SHIELDING_ELEMENT)
        expect(text).toMatch(/^body:/)
        const loaded = ELEMENT_CODECS.load(text) as BodyElement
        expect(loaded.name).toBe(SHIELDING_ELEMENT.name)
        expect(loaded.monster.cards.map(card => card.name)).toEqual(BUILT.cards.map(card => card.name))
        expect(loaded.monster.hearts).toBe(BUILT.hearts)
        expect(loaded.positive).toBeInstanceOf(HeartsBoon)
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

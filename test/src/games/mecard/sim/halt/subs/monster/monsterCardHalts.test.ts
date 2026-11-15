import { describe, expect, test } from "vitest"
import {
    BEAST, BeastCard, CARD_CODECS, CONJURATION, ELEMENT, ElementCard, FURY, GOBLIN, IMPROVISED_ROBOT, MODULE,
    ModuleCard, MONSTER_MAGE_HALT, MONSTER_MECHANIC_HALT, MONSTER_SHAMAN_HALT, darkHalts, RED_HEART,
    beastCardOfMonster, giveKeyIfLacking, moduleOfMonster, signatureOf, STEP,
} from "@game/core/mecard"
import type { Card, HaltType } from "@game/core/mecard"

import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Fixture builders ---

/** What a visit to a halt gave the first deck of the first character, the others left out. */
function given(type: HaltType): Card[] {
    const run = startedRun(1)
    const deck = run.heroes[0].decks[0]
    const before = [...deck]
    const player = new ScriptedPlayer(run)
    type.create(run).start(player)
    player.play()
    return deck.filter((card, rank) => card !== before[rank]).concat(deck.slice(before.length))
}

// --- Tests ---

describe("the halts making a card of a monster", () => {
    test("they are dark halts, so they share the look and the weight of the dark ones", () => {
        for(const type of [MONSTER_MECHANIC_HALT, MONSTER_SHAMAN_HALT, MONSTER_MAGE_HALT]){
            expect(darkHalts()).toContain(type)
        }
    })

    test("the mechanic → a module of a monster, and a robot to plug it in", () => {
        const cards = given(MONSTER_MECHANIC_HALT)
        expect(cards.some(card => card instanceof ModuleCard)).toBe(true)
        expect(cards).toContain(IMPROVISED_ROBOT)
    })

    test("the shaman → a spirit of a monster, and a fury to unleash it", () => {
        const cards = given(MONSTER_SHAMAN_HALT)
        expect(cards.some(card => card instanceof BeastCard)).toBe(true)
        expect(cards).toContain(FURY)
    })

    test("the mage → an element of a monster, and a conjuration to call it", () => {
        const cards = given(MONSTER_MAGE_HALT)
        expect(cards.some(card => card instanceof ElementCard)).toBe(true)
        expect(cards).toContain(CONJURATION)
    })

    test("opened again → the same offers", () => {
        const run = startedRun(1)
        const halt = MONSTER_SHAMAN_HALT.create(run)
        const first = new ScriptedPlayer(run)
        const second = new ScriptedPlayer(run)
        halt.start(first)
        halt.start(second)
        expect(second.log).toEqual(first.log)
    })
})

describe("giveKeyIfLacking", () => {
    test("a deck with no card using a kind → the key given", () => {
        const deck: Card[] = [STEP]
        expect(giveKeyIfLacking(deck, MODULE, IMPROVISED_ROBOT)).toBe(true)
        expect(deck).toEqual([STEP, IMPROVISED_ROBOT])
    })

    test("a deck with one already → nothing given, however it takes the kind", () => {
        const pairs = [[MODULE, IMPROVISED_ROBOT], [BEAST, FURY], [ELEMENT, CONJURATION]] as const
        for(const [family, key] of pairs){
            const deck: Card[] = [key]
            expect(giveKeyIfLacking(deck, family, key), key.name).toBe(false)
            expect(deck).toEqual([key])
        }
    })

    test("the keys are what they are told to be: they take a kind, and give another", () => {
        expect(signatureOf(IMPROVISED_ROBOT).input).toBe(MODULE)
        expect(signatureOf(FURY).input).toBe(BEAST)
        expect(signatureOf(CONJURATION).input).toBe(ELEMENT)
    })
})

describe("the cards made of a monster", () => {
    test("a module → the first round of the monster", () => {
        expect(moduleOfMonster(GOBLIN).cards).toEqual(GOBLIN.cards.slice(0, GOBLIN.draw))
    })

    test("a spirit → the body of the monster, written down then found back whole", () => {
        const card = beastCardOfMonster(GOBLIN)
        expect(card.beast.hearts).toEqual([{ kind: RED_HEART, count: GOBLIN.hearts }])
        const loaded = CARD_CODECS.load(CARD_CODECS.save(card)) as BeastCard
        expect(loaded.name).toBe(card.name)
        expect(loaded.beast.hearts).toEqual(card.beast.hearts)
        expect(loaded.beast.run).toEqual(card.beast.run)
        expect(loaded.beast.bite).toEqual(card.beast.bite)
        expect(loaded.beast.body).toEqual(card.beast.body)
        expect(loaded.beast.sprite.visual).toBe(card.beast.sprite.visual)
    })

    test("a module → written down then found back with its cards", () => {
        const card = moduleOfMonster(GOBLIN)
        const loaded = CARD_CODECS.load(CARD_CODECS.save(card)) as ModuleCard
        expect(loaded.cards).toEqual(card.cards)
    })
})

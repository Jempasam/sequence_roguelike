import { describe, expect, test } from "vitest"
import {
    ALL_MONSTERS, BEAST, BeastCard, BOOSTER_KIND, boosterOfMonster, CARD_CODECS, CONJURATION, convert,
    ELEMENT, elementCardOfMonsters, ElementCard, FURY, FUSION_TARGET, fusionOfMonster, GOBLIN,
    IMPROVISED_ROBOT, LOOT_MONSTERS, MODULE, ModuleCard, MONSTER_KIND, MONSTER_MAGE_HALT,
    MONSTER_MECHANIC_HALT, MONSTER_SHAMAN_HALT, darkHalts, offeredElements, RED_HEART, Rng,
    beastCardOfMonster, giveKeyIfLacking, moduleOfMonster, readsWhole, signatureOf, STEP,
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

    test("the mage → an element of two monsters, and a conjuration to call it", () => {
        const cards = given(MONSTER_MAGE_HALT)
        expect(cards.some(card => card instanceof ElementCard)).toBe(true)
        expect(cards).toContain(CONJURATION)
    })

    test("the mage → offers elements of two monsters each, the same as the conversion makes", () => {
        for(let seed = 1; seed <= 5; seed++){
            const offers = offeredElements(new Rng(seed))
            expect(offers.length).toBeGreaterThan(0)
            expect(offers.length).toBeLessThanOrEqual(3)
            for(const { sources, card } of offers){
                expect(sources).toHaveLength(2)
                expect(sources[0]).not.toBe(sources[1])
                expect(card.name).toBe(elementCardOfMonsters(sources).name)
                expect(card.name).toBe(sources.map(monster => monster.name).join("-"))
            }
        }
    })

    test("the mage → the same offers for the same seed, and never the same pair twice", () => {
        const names = (seed: number): string[] => offeredElements(new Rng(seed)).map(({ card }) => card.name)
        expect(names(3)).toEqual(names(3))
        const found = names(4)
        expect(new Set(found).size).toBe(found.length)
    })

    test("monsters that make no element together → fewer offers, no error, no endless search", () => {
        const [goblin, archer] = [GOBLIN, ALL_MONSTERS.find(each => each.name === "Archer")!]
        expect(offeredElements(new Rng(1), 3, [goblin, archer])).toEqual([])
        expect(offeredElements(new Rng(1), 3, [goblin])).toEqual([])
    })

    test("a fusion and a booster of a monster → the ones of the conversion", () => {
        for(const monster of LOOT_MONSTERS){
            expect(fusionOfMonster(monster).name).toBe(convert(MONSTER_KIND, monster, FUSION_TARGET).name)
            const converted = convert(MONSTER_KIND, monster, BOOSTER_KIND)
            expect(boosterOfMonster(monster).pools).toEqual(converted.pools)
        }
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
    test("a module → cards of the monster that read whole, as the analysis of its deck leads its fight", () => {
        const { cards } = moduleOfMonster(GOBLIN)
        expect(cards.length).toBeGreaterThan(0)
        expect(readsWhole(cards)).toBe(true)
        expect(cards.every(card => GOBLIN.cards.includes(card))).toBe(true)
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

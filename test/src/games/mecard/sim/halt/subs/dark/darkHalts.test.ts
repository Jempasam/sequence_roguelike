import { describe, expect, test } from "vitest"
import {
    BOSS_MONSTERS, LOOT_MONSTERS, GOBLIN, MONSTER_BOOSTER_SIZE, Rng, TAMED_BOSS_WEAKENING, allCards, monsterBooster,
    offeredMonsters, openBooster, possessBy, readsWhole, tamedBoss,
} from "@game/core/mecard"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Tests ---

describe("offeredMonsters", () => {
    test("three distinct common monsters by default", () => {
        const monsters = offeredMonsters(new Rng(1))
        expect(monsters).toHaveLength(3)
        expect(new Set(monsters).size).toBe(3)
        for(const monster of monsters) expect(LOOT_MONSTERS).toContain(monster)
    })
})

describe("monsterBooster", () => {
    test("opened → cards of the monster's deck only", () => {
        const cards = openBooster(new Rng(1), monsterBooster(GOBLIN))
        expect(cards).toHaveLength(MONSTER_BOOSTER_SIZE)
        for(const card of cards) expect(GOBLIN.cards).toContain(card)
    })
})

describe("Run.recruit", () => {
    test("a monster joins as a hero the players plan", () => {
        const run = startedRun(1)
        const recruit = run.recruit(GOBLIN)
        expect(run.heroes).toContain(recruit)
        expect(recruit.controller).toBe("player")
        expect(recruit.hearts).toHaveLength(GOBLIN.hearts)
        expect(allCards(recruit)).toEqual(GOBLIN.cards)
    })
})

describe("Run.graft", () => {
    test("the character takes the monster's deck and hearts, in its place", () => {
        const run = startedRun(1)
        const [hero] = run.heroes
        const hearts = hero.hearts.length
        const count = run.heroes.length
        const made = run.graft(hero, GOBLIN)
        expect(run.heroes).toHaveLength(count)
        expect(run.heroes[0]).toBe(made)
        expect(made.controller).toBe("player")
        expect(made.hearts).toHaveLength(hearts + GOBLIN.hearts)
        expect(made.decks).toContainEqual(GOBLIN.cards)
    })
})

describe("possessBy", () => {
    test("each card fused with the monster's card of the same rank, read again from its start", () => {
        const monsterCards = GOBLIN.cards.slice(0, 2)
        const deck = [...GOBLIN.cards.slice(0, 5)]
        const before = [...deck]
        possessBy(deck, monsterCards)
        expect(deck).toHaveLength(before.length)
        deck.forEach((card, rank) => {
            const other = monsterCards[rank % monsterCards.length]
            const fuses = readsWhole([before[rank], other]) || readsWhole([other, before[rank]])
            if(fuses) expect(card.name, `rank ${rank}`).not.toBe(before[rank].name)
            else expect(card, `rank ${rank}`).toBe(before[rank])
        })
    })
})

describe("tamedBoss", () => {
    test("the same boss, with far fewer hearts", () => {
        for(const boss of BOSS_MONSTERS){
            const tamed = tamedBoss(boss)
            expect(tamed.name).toBe(boss.name)
            expect(tamed.sprite).toBe(boss.sprite)
            expect(tamed.cards).toBe(boss.cards)
            expect(tamed.hearts).toBe(Math.ceil(boss.hearts / TAMED_BOSS_WEAKENING))
        }
    })
})

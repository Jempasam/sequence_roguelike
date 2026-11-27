import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { readsWhole } from "@game/core-src/games/mecard/sim/card/CardChain"
import { openBooster } from "@game/core-src/games/mecard/sim/catalog/boosters"
import { BOSS_MONSTERS, LOOT_MONSTERS, GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { monsterBooster } from "@game/core-src/games/mecard/sim/halt/subs/dark/DarkMagicianHalt"
import {
    TAMED_BOSS_WEAKENING,
    tamedBoss,
} from "@game/core-src/games/mecard/sim/halt/subs/dark/DarkTrainerHalt"
import { offeredMonsters } from "@game/core-src/games/mecard/sim/halt/subs/dark/monster_pool"
import { boosterOfMonster } from "@game/core-src/games/mecard/sim/halt/subs/monster/monsterCards"
import { allCards } from "@game/core-src/games/mecard/sim/run/Hero"
import { possessBy } from "@game/core-src/games/mecard/sim/run/visits"
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
    test("opened → a card of each pool of the monster converted, all of its deck, read whole", () => {
        const booster = monsterBooster(GOBLIN)
        const cards = openBooster(new Rng(1), booster)
        expect(cards).toHaveLength(booster.pools.reduce((sum, { count }) => sum + count, 0))
        for(const card of cards) expect(GOBLIN.cards).toContain(card)
    })

    test("the booster of a monster → the same as the conversion makes, in the dark colors", () => {
        for(const monster of LOOT_MONSTERS){
            const made = boosterOfMonster(monster)
            const dark = monsterBooster(monster)
            expect(dark.name).toBe(monster.name)
            expect(dark.pools).toEqual(made.pools)
        }
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

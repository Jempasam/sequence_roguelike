import { describe, expect, test } from "vitest"
import { rewardHalts } from "@game/core-src/games/mecard/sim/catalog/halts"
import { GOBLIN, GOLEM } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE_REWARD_HALT } from "@game/core-src/games/mecard/sim/halt/subs/reward/BattleRewardHalt"
import { BOSS_REWARD_HALT } from "@game/core-src/games/mecard/sim/halt/subs/reward/BossRewardHalt"
import { ELITE_REWARD_HALT } from "@game/core-src/games/mecard/sim/halt/subs/reward/EliteRewardHalt"
import {
    MONSTER_LOOTING_REWARD_HALT,
} from "@game/core-src/games/mecard/sim/halt/subs/reward/MonsterLootingRewardHalt"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Fight } from "@game/core-src/games/mecard/sim/fight/Fight"
import type { HaltContext, Shown } from "@game/core-src/games/mecard/sim/halt/HaltContext"
import type { HaltType } from "@game/core-src/games/mecard/sim/halt/HaltType"
import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Fixture builders ---

/** What a halt offered, and told, when started: it answers nothing. */
interface Asked {
    readonly offers: readonly Shown[]
    readonly told: string[]
    readonly gold: number
}

/** Start a halt of a sort on a run, after a fight with monsters, none for a visit that follows no fight. */
function started(type: HaltType, seed: number, fight: Pick<Fight, "monsters">|null = null): Asked {
    const run = startedRun(seed)
    const before = run.gold
    const offers: Shown[] = []
    const told: string[] = []
    const ctx = {
        fight,
        offer: (_title: unknown, all: readonly { shown: Shown }[]) => {
            offers.push(...all.map(offer => offer.shown))
        },
        tell: (text: unknown) => told.push(String(text)),
    } as unknown as HaltContext
    type.create(run).start(ctx)
    return { offers, told, gold: run.gold - before }
}

/** The gold a halt gave a player who took the first prize of a visit after a fight. */
function paid(type: HaltType, seed: number): number {
    const run = startedRun(seed)
    const before = run.gold
    const player = new ScriptedPlayer(run)
    type.create(run).start(player)
    player.play()
    return run.gold - before
}

/** The cards a dialog showed. */
function cardsOf(offers: readonly Shown[]): Card[] {
    return offers.flatMap(offer => offer.cards)
}

// --- Tests ---

describe("the halts that pay for a fight", () => {
    test("every sort → told apart by its id, and kept off the map", () => {
        const ids = rewardHalts().map(type => type.id)
        expect(new Set(ids).size).toBe(ids.length)
        for(const type of rewardHalts()) expect(type.onMap).toBe(false)
    })

    test("started → nothing given yet, the gold paid with the first prize taken", () => {
        for(const type of rewardHalts()){
            expect(started(type, 3, { monsters: [GOBLIN] }).gold, type.id).toBe(0)
        }
        expect(paid(BATTLE_REWARD_HALT, 3)).toBeGreaterThanOrEqual(15)
    })

    test("any seed → the reward of a battle: its gold, and four different cards", () => {
        for(let seed = 1; seed <= 20; seed++){
            const { offers } = started(BATTLE_REWARD_HALT, seed)
            expect(paid(BATTLE_REWARD_HALT, seed)).toBeGreaterThanOrEqual(15)
            expect(paid(BATTLE_REWARD_HALT, seed)).toBeLessThanOrEqual(25)
            expect(offers).toHaveLength(5)
            expect(cardsOf(offers)).toHaveLength(4)
            expect(new Set(cardsOf(offers)).size).toBe(4)
            expect(offers.at(-1)?.cards).toEqual([])
        }
    })

    test("any seed → the reward of an elite: two cards, an item and a fusion, with more gold", () => {
        for(let seed = 1; seed <= 20; seed++){
            const { offers } = started(ELITE_REWARD_HALT, seed)
            expect(paid(ELITE_REWARD_HALT, seed)).toBeGreaterThanOrEqual(35)
            expect(paid(ELITE_REWARD_HALT, seed)).toBeLessThanOrEqual(45)
            expect(offers).toHaveLength(5)
            expect(offers.filter(offer => offer.items?.length === 1)).toHaveLength(1)
            expect(cardsOf(offers)).toHaveLength(3)
        }
    })

    test("any seed → the reward of a boss: a card, an item, a fusion and an improved card, with a lot of gold", () => {
        for(let seed = 1; seed <= 20; seed++){
            const { offers } = started(BOSS_REWARD_HALT, seed)
            expect(paid(BOSS_REWARD_HALT, seed)).toBeGreaterThanOrEqual(80)
            expect(paid(BOSS_REWARD_HALT, seed)).toBeLessThanOrEqual(90)
            expect(offers).toHaveLength(5)
            expect(offers.filter(offer => offer.items?.length === 1)).toHaveLength(1)
            expect(cardsOf(offers)).toHaveLength(3)
        }
    })

    test("any seed → the loot of the monsters: four of the strongest third of their cards", () => {
        const fight = { monsters: [GOBLIN, GOLEM] }
        const held = [...new Set(fight.monsters.flatMap(monster => monster.cards))]
        const strongest = held
            .sort((a, b) => b.rarity.rank - a.rarity.rank)
            .slice(0, Math.ceil(held.length / 3))
        for(let seed = 1; seed <= 20; seed++){
            const { offers } = started(MONSTER_LOOTING_REWARD_HALT, seed, fight)
            const cards = cardsOf(offers)
            expect(cards).toHaveLength(Math.min(4, strongest.length))
            expect(offers).toHaveLength(cards.length + 1)
            expect(new Set(cards).size).toBe(cards.length)
            for(const card of cards) expect(strongest).toContain(card)
        }
    })

    test("a visit that follows no fight → the loot of the monsters is only the gold", () => {
        const { offers } = started(MONSTER_LOOTING_REWARD_HALT, 1)
        expect(offers).toHaveLength(1)
        expect(cardsOf(offers)).toEqual([])
    })

    test("only the gold taken → more of it than with a prize, and nothing else given", () => {
        for(const type of rewardHalts()){
            const run = startedRun(4)
            const decks = run.heroes.map(hero => hero.decks.flat().length)
            const items = run.heroes.map(hero => hero.items.length)
            const player = new ScriptedPlayer(run, count => count - 1)
            const before = run.gold
            type.create(run).start(player)
            player.play()
            expect(run.gold - before, type.id).toBeGreaterThan(paid(type, 4) - 11)
            expect(run.heroes.map(hero => hero.decks.flat().length), type.id).toEqual(decks)
            expect(run.heroes.map(hero => hero.items.length), type.id).toEqual(items)
        }
    })
})

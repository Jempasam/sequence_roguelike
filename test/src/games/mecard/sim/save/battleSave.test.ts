import { describe, expect, test } from "vitest"
import {
    ALL_CARDS, BARREL, BATTLE_SAVE_VERSION, BURN, Carried, CardChain, COIN, FIRE, FusionCard, HEALING_POTION,
    HEART_KINDS, ALL_ITEMS, loadBattle, MergedCard, planFor, POISON, POISONED, POTIONS, PUDDLE, RandomCard,
    REPEAT_2, Run, saveBattle, savedCard, SECRET_CARD, SLOWNESS, STATUS_TYPES, STEP, THRUST, UNSTABLE_THRUST,
    ALL_USABLES,
    Vector2, VULNERABLE, WATER, WHETSTONE,
} from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import { started } from "../fixtures"

// --- Fixture builders ---

/** The first battle of a run, its first round drawn. */
function firstBattle(seed = 3): Battle {
    return started(new Run(seed))
}

/** Commit what the bot would play for every unit, players included. */
function planAll(battle: Battle): void {
    for(const unit of battle.initiative) battle.commit(unit, planFor(unit))
}

/** Play the round committed to its end. */
function play(battle: Battle): void {
    battle.endPreparation()
    battle.playRound()
    if(battle.waiting) battle.startRound()
}

/** What a round left of each unit: where it stands, its hearts and its statuses, and who won. */
function outcomeOf(battle: Battle): unknown {
    const units = battle.units.map(unit => {
        return [unit.position, unit.life, [...unit.statuses.values()].map(String)]
    })
    return { units, winner: battle.winner?.name ?? null, phase: battle.phase }
}

/** A save as text, to compare two exactly. */
function textOf(battle: Battle, secret = false): string {
    return JSON.stringify(saveBattle(battle, { secret }))
}

// --- Tests ---

describe("saveBattle", () => {
    test("saved, loaded, saved again → the same save", () => {
        const battle = firstBattle()
        planAll(battle)
        const save = saveBattle(battle)
        expect(JSON.stringify(saveBattle(loadBattle(save)))).toBe(JSON.stringify(save))
    })

    test("a save → through JSON and back, the same", () => {
        const save = saveBattle(firstBattle())
        expect(JSON.parse(JSON.stringify(save))).toEqual(save)
        expect(save.version).toBe(BATTLE_SAVE_VERSION)
    })

    test("during an execution → an error", () => {
        const battle = firstBattle()
        planAll(battle)
        battle.endPreparation()
        expect(() => saveBattle(battle)).toThrow(/never while a round plays/)
    })

    test("secret → every card of the piles secret, the hands kept", () => {
        const battle = firstBattle()
        const save = saveBattle(battle, { secret: true })
        for(const unit of save.units){
            const secret = savedCard(SECRET_CARD)
            expect(unit.decks.flatMap(deck => deck.pile).every(name => name === secret)).toBe(true)
        }
        expect(save.units[0].hand).toEqual(battle.units[0].hand.map(savedCard))
    })

    test("statuses, items and stats changed → loaded back, plugged in again", () => {
        const battle = firstBattle()
        const [hero] = battle.units
        battle.applyStatus(hero, BURN, 3)
        battle.equip(hero, WHETSTONE)
        hero.stats.chainSize.base = 6
        const loaded = loadBattle(saveBattle(battle))
        const [back] = loaded.units
        expect(String(back.statuses.values().next().value)).toBe("brûlure 3 rounds")
        expect(back.stats.strength.value).toBe(1)
        expect(back.stats.chainSize.base).toBe(6)
    })
})

describe("saveBattle, fusions and usables", () => {
    test("a fusion in hand and in a chain → written as its cards, loaded back as one card", () => {
        const run = new Run(3)
        const fusion = new FusionCard([new FusionCard([REPEAT_2, THRUST]), STEP])
        run.heroes[0].decks[0].push(fusion, fusion)
        const battle = started(run)
        const [hero] = battle.units
        hero.hand.push(fusion)
        planAll(battle)
        const save = saveBattle(battle)
        expect(JSON.stringify(saveBattle(loadBattle(save)))).toBe(JSON.stringify(save))
        const [back] = loadBattle(save).units
        const fusions = [...back.hand, ...back.decks.all[0].pile].filter(card => card.contents)
        expect(new Set(fusions).size).toBe(1)
        expect(fusions[0].name).toBe(fusion.name)
    })

    test("a merged card, a draw and a fusion of the catalog in hand → loaded back as what they were", () => {
        const battle = started(new Run(3))
        const [hero] = battle.units
        hero.hand.push(new MergedCard([STEP, THRUST]), new RandomCard(FIRE, WATER), UNSTABLE_THRUST)
        const save = saveBattle(battle)
        expect(JSON.stringify(saveBattle(loadBattle(save)))).toBe(JSON.stringify(save))
        const [merged, drawn, fused] = loadBattle(save).units[0].hand.slice(-3)
        expect(merged).toBeInstanceOf(MergedCard)
        expect(drawn).toBeInstanceOf(RandomCard)
        expect(merged.contents).toEqual([STEP, THRUST])
        expect(fused).toBe(UNSTABLE_THRUST)
    })

    test("a belt and what was chosen → loaded back, used the same", () => {
        const original = firstBattle(4)
        const [hero] = original.units
        hero.usables.push(new Carried(HEALING_POTION), new Carried(HEALING_POTION))
        hero.hearts.damage(2, "physical", null)
        planAll(original)
        original.activate(hero, [hero.usables[1]])
        const copy = loadBattle(saveBattle(original))
        const belt = copy.units[0].usables
        expect(belt.map(each => each.usable)).toEqual([HEALING_POTION, HEALING_POTION])
        expect(copy.activatedBy(copy.units[0])).toEqual([belt[1]])
        play(original)
        play(copy)
        expect(textOf(copy)).toBe(textOf(original))
        expect(copy.units[0].usables.map(each => each.usable)).toEqual([HEALING_POTION])
    })
})

describe("loadBattle", () => {
    test("loaded at the preparation → plays every round as the battle saved", () => {
        const original = firstBattle(7)
        let copy = loadBattle(saveBattle(original))
        for(let round = 0; round < 6 && original.phase === "preparation"; round++){
            planAll(original)
            copy = loadBattle(saveBattle(original))
            play(original)
            play(copy)
            expect(textOf(copy)).toBe(textOf(original))
        }
    })

    test("loaded secret → the round plays the same", () => {
        const original = firstBattle(5)
        planAll(original)
        const copy = loadBattle(saveBattle(original, { secret: true }))
        play(original)
        play(copy)
        // The next round drew secret cards into the hands of the copy: what the round did is compared.
        expect(outcomeOf(copy)).toEqual(outcomeOf(original))
    })

    test("another version → refused", () => {
        const save = { ...saveBattle(firstBattle()), version: BATTLE_SAVE_VERSION + 1 }
        expect(() => loadBattle(save)).toThrow(/version/)
    })
})

describe("summoned bodies, potions and puddles", () => {
    test("a coin, a barrel of poison, a puddle and potion statuses → loaded back, playing the same", () => {
        const original = firstBattle(1)
        const [hero] = original.units
        // In the open, facing the right wall, so there is room for what it throws.
        hero.position = new Vector2(1, 3.5)
        hero.direction = Vector2.RIGHT
        original.applyStatus(hero, POISONED, 2)
        original.applyStatus(hero, VULNERABLE, 3)
        const cards = [COIN, BARREL, POISON, PUDDLE, SLOWNESS]
        hero.stats.chainSize.base = cards.length
        hero.hand.push(...cards)
        original.commit(hero, new CardChain(cards))
        // The others wait this round, so what stands after it does not depend on the monsters drawn.
        for(const unit of original.initiative) if(unit !== hero) original.commit(unit, new CardChain())
        play(original)
        expect(original.phase).toBe("preparation")
        expect(original.living.some(unit => unit.sprite?.visual === "units/coin")).toBe(true)
        const puddles = (battle: Battle) => battle.living.filter(unit => unit.sprite?.visual === "units/puddle")
        expect(puddles(original)).toHaveLength(1)
        const save = saveBattle(original)
        expect(JSON.stringify(saveBattle(loadBattle(save)))).toBe(JSON.stringify(save))
        const copy = loadBattle(save)
        expect(puddles(copy)).toHaveLength(1)
        planAll(original)
        planAll(copy)
        play(original)
        play(copy)
        expect(outcomeOf(copy)).toEqual(outcomeOf(original))
    })
})

describe("catalog names", () => {
    test("each potion and kind of status → a name of its own", () => {
        for(const names of [POTIONS.map(each => each.name), STATUS_TYPES.map(each => each.name)]){
            expect(new Set(names).size).toBe(names.length)
        }
    })

    test("each card, item, usable and heart → a name of its own", () => {
        for(const values of [[...ALL_CARDS, SECRET_CARD], ALL_ITEMS, ALL_USABLES, HEART_KINDS]){
            const names = values.map(value => value.name)
            expect(new Set(names).size).toBe(names.length)
        }
    })
})

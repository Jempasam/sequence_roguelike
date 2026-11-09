import { describe, expect, test } from "vitest"
import {
    BOTTLE, BOTTLE_BAG, DODGE_CARD, DODGE_SCEPTER, FANG, POISON, POTION_BAG, STEP, WHETSTONE,
} from "@game/core/mecard"
import type { Battle, Card, Unit } from "@game/core/mecard"

import { battle, MONSTERS, unit } from "../fixtures"
import { DamageType } from "@game/core/mecard"

// --- Fixture builders ---

/** A unit drawing no card, with an enemy far away so the battle goes on, and a deck of cards. */
function drawingNothing(deck: Card[]): { on: Battle, holder: Unit } {
    const on = battle()
    const holder = unit(on, 3, 3)
    unit(on, 0, 0, { team: MONSTERS })
    holder.stats.firstDraw.base = 0
    holder.decks.all[0].pile.push(...deck)
    return { on, holder }
}

// --- Tests ---

describe("Item, unplugged", () => {
    test("an item taken off during the battle → its modifier taken back", () => {
        const on = battle()
        const holder = unit(on, 3, 3)
        const base = holder.stats.strength.value
        on.equip(holder, WHETSTONE)
        expect(holder.stats.strength.value).toBeGreaterThan(base)
        on.unequip(holder, WHETSTONE)
        expect(holder.stats.strength.value).toBe(base)
        expect(holder.items).toEqual([])
    })

    test("an item taken off → its listeners taken back", () => {
        const on = battle()
        const holder = unit(on, 3, 3)
        const before = holder.hitting.size
        on.equip(holder, FANG)
        expect(holder.hitting.size).toBe(before + 1)
        on.unequip(holder, FANG)
        expect(holder.hitting.size).toBe(before)
    })

    test("the battle over → every item unplugged", () => {
        const on = battle()
        const holder = unit(on, 3, 3)
        const enemy = unit(on, 3, 1, { team: MONSTERS })
        on.equip(holder, FANG)
        const before = holder.hitting.size
        on.startRound()
        enemy.hearts.damage(enemy.life, DamageType.PHYSICAL, null)
        on.endPreparation()
        on.playRound()
        expect(on.phase).toBe("over")
        expect(holder.hitting.size).toBe(before - 1)
    })
})

describe("Item, after the draw", () => {
    test("a bottle bag, no bottle in hand → a bottle given", () => {
        const { on, holder } = drawingNothing([])
        on.equip(holder, BOTTLE_BAG)
        on.startRound()
        expect(holder.hand).toEqual([BOTTLE])
    })

    test("a bottle bag, a bottle in hand already → none more", () => {
        const { on, holder } = drawingNothing([])
        on.equip(holder, BOTTLE_BAG)
        holder.hand.push(BOTTLE)
        on.startRound()
        expect(holder.hand).toEqual([BOTTLE])
    })

    test("a scepter, its card not in hand → a copy given, not when the hand is full", () => {
        const { on, holder } = drawingNothing([])
        on.equip(holder, DODGE_SCEPTER)
        on.startRound()
        expect(holder.hand).toEqual([DODGE_CARD])
        const full = drawingNothing([])
        full.on.equip(full.holder, DODGE_SCEPTER)
        full.holder.hand.push(...Array.from({ length: full.holder.stats.handSize.value }, () => STEP))
        full.on.startRound()
        expect(full.holder.hand).not.toContain(DODGE_CARD)
    })

    test("a bag of potions, none in hand → one taken from the deck", () => {
        const { on, holder } = drawingNothing([STEP, POISON, STEP])
        on.equip(holder, POTION_BAG)
        on.startRound()
        expect(holder.hand).toEqual([POISON])
        expect(holder.decks.all[0].pile).toEqual([STEP, STEP])
    })
})

import { describe, expect, test } from "vitest"
import { plainText, spansOf } from "@game/core"
import {
    BLACK_HEART, BLUE_HEART, DODGE, EXPLOSIVE_HEART, GLASS_HEART, Heart, KEPT_LOOT_HEARTS,
    PINK_HEART, QUICK_HEART, RED_HEART, SHIELD_HEART, SOLID_HEART, SPENT_LOOT_HEARTS, THORN_HEART, TIME_HEART,
    VITAL_HEART,
} from "@game/core/mecard"
import type { Battle, HeartKind, Unit } from "@game/core/mecard"

import { battle, MONSTERS, rgbaOf, unit } from "../fixtures"

// --- Fixture builders ---

/** A unit alone with an enemy far away, so a round ends without the battle being over, its hearts given. */
function holding(hearts: Heart[]): { on: Battle, target: Unit } {
    const on = battle()
    const target = unit(on, 3, 3, { hearts })
    unit(on, 0, 0, { team: MONSTERS })
    return { on, target }
}

/** Play a round where nobody does anything. */
function idleRound(on: Battle): void {
    on.startRound()
    on.endPreparation()
    on.playRound()
}

/** The bar of a unit, each heart its kind, an empty one in brackets: `rouge, [rouge]`. */
function bar(target: Unit): string {
    return target.hearts.all.map(heart => heart.isEmpty ? `[${heart.kind.name}]` : heart.kind.name).join(", ")
}

/** Hearts of kinds, full, in order. */
function hearts(...kinds: HeartKind[]): Heart[] {
    return kinds.map(kind => new Heart(kind))
}

// --- Tests ---

describe("Heart", () => {
    test("a heart → its kind; an empty one → its kind, said empty", () => {
        expect(`${new Heart(GLASS_HEART)}`).toBe(GLASS_HEART.name)
        expect(plainText(new Heart(RED_HEART, true))).toBe(`${RED_HEART.name} vide`)
        expect(spansOf(new Heart(GLASS_HEART))[0].color).toEqual(rgbaOf({ color: GLASS_HEART.color }))
    })
})

describe("HeartRule, wounds", () => {
    test("a wound → the last hearts lost first, one per point", () => {
        const { target } = holding(hearts(RED_HEART, RED_HEART, SHIELD_HEART))
        expect(target.hearts.damage(2, "physical", null)).toBe(2)
        expect(bar(target)).toBe("rouge, [rouge]")
    })

    test("an empty red heart → never targeted: the wound goes to the full one before it", () => {
        const { target } = holding([new Heart(RED_HEART), new Heart(RED_HEART, true)])
        target.hearts.damage(1, "physical", null)
        expect(bar(target)).toBe("[rouge], [rouge]")
        expect(target.alive).toBe(false)
    })

    test("a solid heart last → the whole wound blocked", () => {
        const { target } = holding(hearts(RED_HEART, SOLID_HEART))
        expect(target.hearts.damage(5, "physical", null)).toBe(0)
        expect(bar(target)).toBe("rouge, solide")
    })

    test("a time heart last → the wound blocked; the last one burns out at each end of round", () => {
        const { on, target } = holding(hearts(RED_HEART, TIME_HEART, TIME_HEART))
        expect(target.hearts.damage(3, "physical", null)).toBe(0)
        idleRound(on)
        expect(bar(target)).toBe("rouge, temps")
        idleRound(on)
        expect(bar(target)).toBe("rouge")
    })

    test("a unit with only time hearts → dies when the last one burns out", () => {
        const { on, target } = holding(hearts(TIME_HEART))
        idleRound(on)
        expect(target.alive).toBe(false)
    })

    test("a glass heart broken → another glass heart broken with it, no third", () => {
        const { target } = holding(hearts(RED_HEART, GLASS_HEART, GLASS_HEART, GLASS_HEART))
        target.hearts.damage(1, "physical", null)
        expect(bar(target)).toBe("rouge, verre")
    })

    test("a thorn heart broken → its breaker wounded once per thorn heart", () => {
        const { on, target } = holding(hearts(RED_HEART, THORN_HEART, THORN_HEART))
        const attacker = unit(on, 3, 4)
        target.hearts.damage(2, "physical", attacker)
        expect(attacker.life).toBe(2)
    })
})

describe("HeartRule, ends of round and healing", () => {
    test("blue hearts → the last lost at each end of round, never healed", () => {
        const { on, target } = holding(hearts(RED_HEART, BLUE_HEART, BLUE_HEART))
        idleRound(on)
        expect(bar(target)).toBe("rouge, bleu")
        target.hearts.heal(3)
        expect(bar(target)).toBe("rouge, bleu")
    })

    test("pink hearts → left empty once lost, the last empty one back at each end of round", () => {
        const { on, target } = holding(hearts(RED_HEART, PINK_HEART, PINK_HEART))
        target.hearts.damage(2, "physical", null)
        expect(bar(target)).toBe("rouge, [rose], [rose]")
        idleRound(on)
        expect(bar(target)).toBe("rouge, [rose], rose")
    })

    test("black hearts → the last full one lost at each end of round, healed back", () => {
        const { on, target } = holding(hearts(RED_HEART, BLACK_HEART, BLACK_HEART))
        idleRound(on)
        expect(bar(target)).toBe("rouge, noir, [noir]")
        target.hearts.heal(1)
        expect(bar(target)).toBe("rouge, noir, noir")
    })

    test("healing → the empty red hearts filled from the left", () => {
        const { target } = holding(hearts(RED_HEART, RED_HEART, RED_HEART))
        target.hearts.damage(2, "physical", null)
        target.hearts.heal(1)
        expect(bar(target)).toBe("rouge, rouge, [rouge]")
    })
})

describe("HeartRule, rules plugged", () => {
    test("the last heart of a kind gone → its rules taken back; a heart of a new kind → its rules plugged", () => {
        const { on, target } = holding(hearts(RED_HEART, SHIELD_HEART))
        expect(target.hearts.rules.has(SHIELD_HEART)).toBe(true)
        target.hearts.damage(1, "physical", null)
        expect(target.hearts.rules.has(SHIELD_HEART)).toBe(false)
        target.hearts.give(new Heart(TIME_HEART))
        expect(target.hearts.rules.has(TIME_HEART)).toBe(true)
        idleRound(on)
        expect(bar(target)).toBe("rouge")
    })

    test("a dead unit → its rules taken back: its pink hearts never come back", () => {
        const { on, target } = holding(hearts(PINK_HEART))
        target.hearts.damage(1, "physical", null)
        expect(target.alive).toBe(false)
        idleRound(on)
        expect(bar(target)).toBe("[rose]")
    })
})

describe("The hearts used once", () => {
    test("explosive lost → a blast around, its unit spared, what stands far left alone", () => {
        const on = battle()
        const hearts = [new Heart(RED_HEART), new Heart(EXPLOSIVE_HEART)]
        const target = unit(on, 3, 3, { hearts })
        const near = unit(on, 3.8, 3, { team: MONSTERS })
        const far = unit(on, 6, 6, { team: MONSTERS })
        target.hearts.damage(1, "physical", far)
        expect(bar(target)).toBe("rouge")
        expect(near.life).toBe(3)
        expect(far.life).toBe(4)
    })

    test("vital lost → a red heart healed, even from the last wound", () => {
        const { target } = holding([new Heart(RED_HEART, true), new Heart(VITAL_HEART)])
        target.hearts.damage(1, "physical", null)
        expect(bar(target)).toBe("rouge")
        expect(target.alive).toBe(true)
    })

    test("quick lost → dodging what comes next this round", () => {
        const { target } = holding([new Heart(RED_HEART), new Heart(QUICK_HEART)])
        target.hearts.damage(1, "physical", null)
        expect(target.statuses.has(DODGE)).toBe(true)
        target.hearts.damage(1, "physical", null)
        expect(bar(target)).toBe("rouge")
    })
})

describe("The loot of hearts", () => {
    /** Does a kind of heart leave a place once lost? */
    function leavesPlace(kind: HeartKind): boolean {
        const { target } = holding([new Heart(RED_HEART), new Heart(kind)])
        target.hearts.remove(kind, 1, null)
        return target.hearts.all.some(heart => heart.kind === kind)
    }

    test("those won after a fight leave a place once lost, those of the hospital do not", () => {
        expect(KEPT_LOOT_HEARTS.every(({ heart }) => leavesPlace(heart))).toBe(true)
        expect(SPENT_LOOT_HEARTS.some(({ heart }) => leavesPlace(heart))).toBe(false)
    })

    test("each kind comes in its own number, for balance", () => {
        const loots = [...KEPT_LOOT_HEARTS, ...SPENT_LOOT_HEARTS]
        const counts = new Map(loots.map(({ heart, count }) => [heart, count]))
        expect(counts.get(PINK_HEART)).toBe(1)
        expect(counts.get(BLACK_HEART)).toBe(3)
        expect(counts.get(BLUE_HEART)).toBe(3)
        expect(counts.get(GLASS_HEART)).toBe(4)
        expect(counts.get(SHIELD_HEART)).toBe(2)
        expect(counts.get(THORN_HEART)).toBe(1)
        expect(counts.get(VITAL_HEART)).toBe(1)
        expect(counts.get(EXPLOSIVE_HEART)).toBe(1)
    })
})

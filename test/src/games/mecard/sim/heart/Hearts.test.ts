import { describe, expect, test } from "vitest"
import { Heart, PINK_HEART, RED_HEART, SHIELD_HEART } from "@game/core/mecard"
import type { Battle, HeartKind, Unit } from "@game/core/mecard"

import { battle, MONSTERS, unit } from "../fixtures"
import { DamageType } from "@game/core/mecard"

/** A unit holding hearts in a battle, an enemy across so the battle goes on. */
function holding(hearts: Heart[]): { on: Battle, target: Unit } {
    const on = battle()
    const target = unit(on, 1, 5, { hearts })
    unit(on, 6, 1, { team: MONSTERS })
    return { on, target }
}

/** What the hearts of a unit tell, each thing by its name. */
function told(target: Unit): string[] {
    const names: string[] = []
    const { hearts } = target
    hearts.onAdd.add(() => names.push("add"))
    hearts.onRemove.add(() => names.push("remove"))
    hearts.onReplace.add(() => names.push("replace"))
    hearts.onWound.add(() => names.push("wound"))
    hearts.onDamage.add(() => names.push("damage"))
    hearts.onHeal.add(() => names.push("heal"))
    return names
}

// --- Tests ---

describe("Hearts, counting", () => {
    test("empty hearts count in the most it can hold, not in what it has", () => {
        const { target } = holding([
            new Heart(RED_HEART, true), new Heart(RED_HEART), new Heart(SHIELD_HEART),
        ])
        expect(target.hearts.maxHearts).toBe(3)
        expect(target.hearts.hearts).toBe(2)
    })

    test("only the hearts leaving a place are kept, the empty ones included", () => {
        const { target } = holding([
            new Heart(RED_HEART, true), new Heart(PINK_HEART), new Heart(SHIELD_HEART),
        ])
        expect(target.hearts.maxKeptHearts).toBe(2)
    })

    test("no heart keeping it alive → dead", () => {
        expect(holding([new Heart(RED_HEART, true)]).target.hearts.isDead).toBe(true)
        expect(holding([new Heart(RED_HEART)]).target.hearts.isDead).toBe(false)
    })
})

describe("Hearts, what it tells", () => {
    test("a wound → the hearts it took and the wound, never a removal", () => {
        const { target } = holding(Heart.many(RED_HEART, 3))
        const names = told(target)
        target.hearts.damage(2, DamageType.PHYSICAL, null)
        expect(names).toEqual(["wound", "damage"])
    })

    test("a heart leaving no place, outside of a wound → removed", () => {
        const { target } = holding([new Heart(RED_HEART), new Heart(SHIELD_HEART)])
        const names = told(target)
        target.hearts.remove(SHIELD_HEART, 1, null)
        expect(names).toEqual(["remove"])
    })

    test("a heart leaving a place, outside of a wound → replaced by its empty place", () => {
        const { target } = holding(Heart.many(RED_HEART, 2))
        const replaced: Heart[] = []
        target.hearts.onReplace.add(({ replacements }) => replaced.push(...replacements))
        target.hearts.remove(RED_HEART, 1, null)
        expect(replaced.map(heart => heart.isEmpty)).toEqual([true])
    })

    test("several hearts of a kind removed → told at once, the last first", () => {
        const { target } = holding([new Heart(RED_HEART), ...Heart.many(SHIELD_HEART, 3)])
        const losses: { kind: HeartKind, indexes: readonly number[] }[] = []
        target.hearts.onRemove.add(({ kind, indexes }) => losses.push({ kind, indexes }))
        expect(target.hearts.remove(SHIELD_HEART, 2, null)).toBe(2)
        expect(losses).toEqual([{ kind: SHIELD_HEART, indexes: [3, 2] }])
        expect(target.hearts.all.map(heart => heart.kind)).toEqual([RED_HEART, SHIELD_HEART])
    })

    test("more hearts asked than the bar holds, some empty → only the full ones lost", () => {
        const { target } = holding([new Heart(RED_HEART), new Heart(RED_HEART, true), new Heart(RED_HEART)])
        const replaced: number[] = []
        target.hearts.onReplace.add(({ indexes }) => replaced.push(...indexes))
        expect(target.hearts.remove(RED_HEART, 5, null)).toBe(2)
        expect(replaced).toEqual([2, 0])
    })

    test("a kind the bar does not hold → nothing told", () => {
        const { target } = holding(Heart.many(RED_HEART, 2))
        const names = told(target)
        expect(target.hearts.remove(SHIELD_HEART, 1, null)).toBe(0)
        expect(names).toEqual([])
    })

    test("a wound across two kinds → told kind by kind", () => {
        const { target } = holding([...Heart.many(RED_HEART, 2), new Heart(SHIELD_HEART)])
        const wounds: { kind: HeartKind, indexes: readonly number[] }[] = []
        target.hearts.onWound.add(({ kind, indexes }) => wounds.push({ kind, indexes }))
        target.hearts.damage(2, DamageType.PHYSICAL, null)
        expect(wounds).toEqual([
            { kind: SHIELD_HEART, indexes: [2] },
            { kind: RED_HEART, indexes: [1] },
        ])
    })

    test("a heart given → added, where the bar puts it", () => {
        const { target } = holding([new Heart(RED_HEART), new Heart(SHIELD_HEART)])
        const places: number[] = []
        target.hearts.onAdd.add(({ index }) => places.push(index))
        target.hearts.give(new Heart(RED_HEART))
        expect(places).toEqual([1])
    })

    test("an empty heart filled → added and healed", () => {
        const { target } = holding([new Heart(PINK_HEART), new Heart(PINK_HEART, true)])
        const names = told(target)
        target.hearts.restore(target.hearts.all[1])
        expect(names).toEqual(["add", "heal"])
    })

    test("the battle forwards each to whoever shows it, with the bar as it is then", () => {
        const { on, target } = holding(Heart.many(RED_HEART, 3))
        const names: string[] = []
        const { signals } = on
        signals.heartWounded.add(({ hearts }) => names.push(`wounded ${hearts.filter(each => !each.isEmpty).length}`))
        signals.damaged.add(() => names.push("damaged"))
        signals.heartReplaced.add(() => names.push("replaced"))
        signals.heartRemoved.add(() => names.push("removed"))
        signals.heartAdded.add(() => names.push("added"))
        signals.healed.add(() => names.push("healed"))
        target.hearts.damage(1, DamageType.PHYSICAL, null)
        target.hearts.remove(RED_HEART, 1, null)
        target.hearts.give(new Heart(SHIELD_HEART))
        target.hearts.remove(SHIELD_HEART, 1, null)
        target.hearts.heal(1)
        expect(names).toEqual(["wounded 2", "damaged", "replaced", "added", "removed", "healed"])
    })

    test("the last heart gone → the unit dies, once", () => {
        const { on, target } = holding(Heart.many(RED_HEART, 2))
        let deaths = 0
        target.onDeath.add(() => deaths++)
        target.hearts.slay(null)
        expect(deaths).toBe(1)
        expect(on.living).not.toContain(target)
    })
})

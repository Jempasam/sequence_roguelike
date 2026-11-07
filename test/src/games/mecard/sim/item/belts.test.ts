import { describe, expect, test } from "vitest"
import { BLUE_HEART, DEATH_BELT, Heart, RED_HEART, SHIELD_HEART, STRENGTH_BELT } from "@game/core/mecard"

import { battle, MONSTERS, unit } from "../fixtures"

// --- Tests ---

describe("the belts", () => {
    test("strength belt: the last hearts lost → a shield keeps it alive", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 2) })
        unit(on, 0, 0, { team: MONSTERS })
        on.equip(holder, STRENGTH_BELT)
        holder.hearts.damage(5, "physical", null)
        expect(holder.alive).toBe(true)
        expect(holder.hearts.all.some(heart => heart.kind === SHIELD_HEART)).toBe(true)
    })

    test("death belt: three blue hearts keep it alive", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        on.equip(holder, DEATH_BELT)
        holder.hearts.damage(5, "physical", null)
        expect(holder.alive).toBe(true)
        expect(holder.hearts.all.filter(heart => heart.kind === BLUE_HEART)).toHaveLength(3)
    })

    test("no belt → it dies", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        holder.hearts.damage(5, "physical", null)
        expect(holder.alive).toBe(false)
    })
})

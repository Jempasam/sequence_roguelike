import { describe, expect, test } from "vitest"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { SHIELD_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ShieldHeartKind"
import { DEATH_BELT, STRENGTH_BELT } from "@game/core-src/games/mecard/sim/item/subs/heal/Belts"

import { battle, MONSTERS, unit } from "../fixtures"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"

// --- Tests ---

describe("the belts", () => {
    test("strength belt: the last hearts lost → a shield keeps it alive", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 2) })
        unit(on, 0, 0, { team: MONSTERS })
        on.equip(holder, STRENGTH_BELT)
        holder.hearts.damage(5, DamageType.PHYSICAL, null)
        expect(holder.alive).toBe(true)
        expect(holder.hearts.all.some(heart => heart.kind === SHIELD_HEART)).toBe(true)
    })

    test("death belt: three blue hearts keep it alive", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        on.equip(holder, DEATH_BELT)
        holder.hearts.damage(5, DamageType.PHYSICAL, null)
        expect(holder.alive).toBe(true)
        expect(holder.hearts.all.filter(heart => heart.kind === BLUE_HEART)).toHaveLength(3)
    })

    test("no belt → it dies", () => {
        const on = battle()
        const holder = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        holder.hearts.damage(5, DamageType.PHYSICAL, null)
        expect(holder.alive).toBe(false)
    })
})

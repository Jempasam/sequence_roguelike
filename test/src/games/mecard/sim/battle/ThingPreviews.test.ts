import { describe, expect, test } from "vitest"
import { BLOOD_TRAIL } from "@game/core-src/games/mecard/sim/item/subs/combat/BloodTrail"
import { SALT_GLASS } from "@game/core-src/games/mecard/sim/item/subs/combat/SaltGlass"
import { TESTAMENT } from "@game/core-src/games/mecard/sim/item/subs/combat/Testament"
import { KnifeReturn } from "@game/core-src/games/mecard/sim/process/subs/KnifeReturn"
import { IronChain } from "@game/core-src/games/mecard/sim/process/subs/Links"
import { Riding } from "@game/core-src/games/mecard/sim/process/subs/Riding"
import { EXPLOSIVE } from "@game/core-src/games/mecard/sim/status/subs/Explosive"
import { HEALING } from "@game/core-src/games/mecard/sim/status/subs/Healing"
import { STINKING } from "@game/core-src/games/mecard/sim/status/subs/Stench"
import { BLEEDING } from "@game/core-src/games/mecard/sim/status/subs/Wounds"
import type { Indicator, Preview } from "@game/core-src/games/mecard/sim/battle/preview/Preview"

import { battle, MONSTERS, unit } from "../fixtures"

/** The kinds of the indicators of a preview. */
function kinds(preview: Preview): Indicator["kind"][] {
    return preview.indicators.map(indicator => indicator.kind)
}

describe("Status previews", () => {
    test("an explosive status with a unit within its blast → the blast and the unit marked", () => {
        const on = battle()
        const bomb = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        on.applyStatus(bomb, EXPLOSIVE, 2)
        const preview = bomb.statusOf(EXPLOSIVE)!.preview!({ battle: on, unit: bomb, pose: bomb })
        expect(kinds(preview)).toEqual(["polygon", "polygon"])
    })

    test("a stench with a unit within its reach → the zone and the push of the unit", () => {
        const on = battle()
        const skunk = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        on.applyStatus(skunk, STINKING, 2)
        const preview = skunk.statusOf(STINKING)!.preview!({ battle: on, unit: skunk, pose: skunk })
        expect(kinds(preview)).toEqual(["polygon", "arrow"])
    })

    test("a healing totem with no ally near → only its zone", () => {
        const on = battle()
        const totem = unit(on, 3, 5)
        unit(on, 3, 4, { team: MONSTERS })
        on.applyStatus(totem, HEALING, 1)
        const preview = totem.statusOf(HEALING)!.preview!({ battle: on, unit: totem, pose: totem })
        expect(kinds(preview)).toEqual(["polygon"])
    })
})

describe("Process previews", () => {
    test("a ride → an arrow ahead of the unit", () => {
        const on = battle()
        const rider = unit(on, 3, 5)
        const preview = new Riding(2).preview!({ battle: on, unit: rider, pose: rider })
        expect(kinds(preview)).toContain("arrow")
    })

    test("an iron chain too slack → a pull each way, close enough → none", () => {
        const on = battle()
        const hero = unit(on, 1, 5)
        const far = unit(on, 6, 5, { team: MONSTERS })
        const near = unit(on, 2, 5, { team: MONSTERS })
        expect(kinds(new IronChain(far, 2, 1).preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["arrow", "arrow"])
        expect(kinds(new IronChain(near, 2, 1).preview!({ battle: on, unit: hero, pose: hero }))).toEqual([])
    })

    test("a knife coming back through an enemy → the way and the enemy marked", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const knife = unit(on, 3, 1)
        unit(on, 3, 3, { team: MONSTERS })
        expect(kinds(new KnifeReturn(knife).preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon", "polygon"])
    })
})

describe("Item previews", () => {
    test("a salt glass with a unit near → its range and the unit marked, nobody near → its range only", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        expect(kinds(SALT_GLASS.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon"])
        unit(on, 3, 4, { team: MONSTERS })
        expect(kinds(SALT_GLASS.preview!({ battle: on, unit: hero, pose: hero }))).toEqual(["polygon", "polygon"])
    })

    test("a testament with an ally → an arrow to the heir, alone → nothing", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        expect(kinds(TESTAMENT.preview!({ battle: on, unit: hero, pose: hero }))).toEqual([])
        unit(on, 3, 3)
        expect(kinds(TESTAMENT.preview!({ battle: on, unit: hero, pose: hero }))).toContain("arrow")
    })

    test("a blood trail with a bleeding enemy → the way on, nobody bleeding → nothing", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        const prey = unit(on, 3, 2, { team: MONSTERS })
        expect(kinds(BLOOD_TRAIL.preview!({ battle: on, unit: hero, pose: hero }))).toEqual([])
        on.applyStatus(prey, BLEEDING, 1)
        expect(kinds(BLOOD_TRAIL.preview!({ battle: on, unit: hero, pose: hero }))).toContain("arrow")
    })
})

import { describe, expect, test } from "vitest"
import { POTENTIAL_COLOR } from "@game/core-src/games/mecard/sim/battle/previewColors"
import { DEMON_SLASH, THRUST_CHARGE } from "@game/core-src/games/mecard/sim/card/subs/attack/Charges"
import { CROSS_CUT, DEATH_SCYTHE, FISHING } from "@game/core-src/games/mecard/sim/card/subs/attack/Crosses"
import {
    DEMONIC_STRIKE,
    GREAT_THRUST,
    QUAKE,
    SACRIFICE,
    SUPLEX,
} from "@game/core-src/games/mecard/sim/card/subs/attack/Smashes"
import { CHARGED_SHOT, MACHINE_GUN } from "@game/core-src/games/mecard/sim/card/subs/attack/Volleys"
import { DEMONIC } from "@game/core-src/games/mecard/sim/status/subs/DemonEnergy"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"

// --- Tests ---

describe("SUPLEX", () => {
    test("hurts 4 the nearest unit behind and stuns it", () => {
        const on = battle()
        const thrower = unit(on, 3.5, 3.5)
        const near = unit(on, 3.5, 4.2, { team: MONSTERS })
        const far = unit(on, 3.5, 4.4, { team: MONSTERS, hearts: undefined })
        play(on, [[thrower, chain(SUPLEX)]])
        expect(near.life).toBe(0)
        expect(far.life).toBe(4)
    })
})

describe("GREAT_THRUST", () => {
    test("nothing in the first meter, 1 + distance/2 farther", () => {
        const on = battle()
        const thrower = unit(on, 3.5, 6)
        const close = unit(on, 3.5, 6.8, { team: MONSTERS })
        play(on, [[thrower, chain(GREAT_THRUST)]])
        expect(close.life).toBe(4)

        const on2 = battle()
        const thrower2 = unit(on2, 3.5, 6)
        const far = unit(on2, 3.5, 3.5, { team: MONSTERS })
        play(on2, [[thrower2, chain(GREAT_THRUST)]])
        expect(far.life).toBe(2)
    })
})

describe("THRUST_CHARGE", () => {
    test("goes through the units and hurts them", () => {
        const on = battle()
        const charger = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 5, { team: MONSTERS })
        play(on, [[charger, chain(THRUST_CHARGE)]])
        expect(charger.position.y).toBeCloseTo(3, 1)
        expect(foe.life).toBe(3)
    })
})

describe("DEMON_SLASH", () => {
    test("nobody on the way → a dash of two meters", () => {
        const on = battle()
        const slasher = unit(on, 3.5, 6.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[slasher, chain(DEMON_SLASH)]])
        expect(slasher.position.y).toBeCloseTo(4.5, 1)
    })

    test("a unit on the way → a meter farther, and the units cut once", () => {
        const on = battle()
        const slasher = unit(on, 3.5, 6.5)
        const near = unit(on, 3.5, 6, { team: MONSTERS })
        const sameStretch = unit(on, 3.5, 5.6, { team: MONSTERS })
        const beyond = unit(on, 3.5, 1.5, { team: MONSTERS })
        play(on, [[slasher, chain(DEMON_SLASH)]])
        expect(slasher.position.y).toBeCloseTo(3.5, 1)
        expect(near.life).toBe(3)
        expect(sameStretch.life).toBe(3)
        expect(beyond.life).toBe(4)
    })

    test("never past five meters", () => {
        const on = battle()
        const slasher = unit(on, 3.5, 6.9)
        for(const y of [6.2, 5.2, 4.2, 3.2, 2.2, 1.2]) unit(on, 3.5, y, { team: MONSTERS })
        play(on, [[slasher, chain(DEMON_SLASH)]])
        expect(slasher.position.y).toBeGreaterThanOrEqual(1.9 - 0.1)
    })

    test("lengthened at least twice → the damage twice", () => {
        const on = battle()
        const slasher = unit(on, 3.5, 6.5)
        const near = unit(on, 3.5, 6, { team: MONSTERS })
        const far = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[slasher, chain(DEMON_SLASH)]])
        expect(near.life).toBe(2)
        expect(far.life).toBe(2)
    })
})

describe("MACHINE_GUN and CHARGED_SHOT", () => {
    test("machine gun turns after a hit and shoots again", () => {
        const on = battle()
        const gunner = unit(on, 3.5, 3.5)
        const a = unit(on, 3.5, 1.5, { team: MONSTERS })
        const b = unit(on, 5.5, 1.5, { team: MONSTERS })
        play(on, [[gunner, chain(MACHINE_GUN)]])
        expect(a.life).toBe(3)
        expect(b.life).toBeLessThan(4)
    })

    test("machine gun previewed with nobody around → a grey line in each of the eight directions", () => {
        const on = battle()
        const gunner = unit(on, 3.5, 3.5)
        const [root] = chain(MACHINE_GUN).preview(on, gunner)
        const lines = root.preview?.indicators.filter(indicator => indicator.color === POTENTIAL_COLOR)
        expect(lines).toHaveLength(8)
    })

    test("a charged shot with nothing before it shoots once", () => {
        const on = battle()
        const gunner = unit(on, 3.5, 3.5)
        const a = unit(on, 3.5, 1.5, { team: MONSTERS })
        play(on, [[gunner, chain(CHARGED_SHOT)]])
        expect(a.life).toBe(3)
    })
})

describe("DEMONIC_STRIKE", () => {
    test("hurts 2 and gives a round of energy per unit hit", () => {
        const on = battle()
        const striker = unit(on, 3.5, 5)
        const a = unit(on, 3.5, 4, { team: MONSTERS })
        const b = unit(on, 3.9, 4, { team: MONSTERS })
        play(on, [[striker, chain(DEMONIC_STRIKE)]])
        expect(a.life).toBe(2)
        expect(b.life).toBe(2)
        expect(striker.statuses.has(DEMONIC)).toBe(true)
    })
})

describe("QUAKE and SACRIFICE", () => {
    test("quake hurts all around, an ally too", () => {
        const on = battle()
        const shaker = unit(on, 3.5, 3.5)
        const foe = unit(on, 4.3, 3.5, { team: MONSTERS })
        play(on, [[shaker, chain(QUAKE)]])
        expect(foe.life).toBe(3)
    })

    test("sacrifice costs a heart", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[hero, chain(SACRIFICE)]])
        expect(hero.life).toBe(3)
        expect(foe.life).toBe(2)
    })
})

describe("DEATH_SCYTHE", () => {
    test("a kill hurts everyone, and goes on while there is a kill", () => {
        const on = battle()
        const reaper = unit(on, 3.5, 5)
        const weak = unit(on, 3.5, 3.8, { team: MONSTERS })
        const other = unit(on, 1, 1, { team: MONSTERS })
        weak.hearts.damage(3, DamageType.PHYSICAL, null)
        play(on, [[reaper, chain(DEATH_SCYTHE)]])
        expect(weak.alive).toBe(false)
        expect(other.life).toBe(3)
    })
})

describe("CROSS_CUT", () => {
    test("a unit at the crossing is hit twice", () => {
        const on = battle()
        const cutter = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[cutter, chain(CROSS_CUT)]])
        expect(foe.life).toBe(2)
    })
})

describe("FISHING", () => {
    test("a kill gives gold, teleports and puts a copy in hand", () => {
        const on = battle()
        const fisher = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 3.5, { team: MONSTERS })
        unit(on, 1, 1, { team: MONSTERS })
        foe.hearts.damage(3, DamageType.PHYSICAL, null)
        let gold = 0
        on.onGetGold.add(({ amount }) => { gold += amount })
        play(on, [[fisher, chain(FISHING)]])
        expect(foe.alive).toBe(false)
        expect(gold).toBe(10)
        expect(fisher.position.y).toBeCloseTo(3.5, 1)
        expect(fisher.hand).toContain(FISHING)
    })
})

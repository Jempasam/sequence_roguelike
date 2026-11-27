import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { SHOT } from "@game/core-src/games/mecard/sim/card/subs/attack/Shot"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { AIM, STURDY_AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { BARREL } from "@game/core-src/games/mecard/sim/card/subs/potion/PotionActions"
import { POISON } from "@game/core-src/games/mecard/sim/card/subs/potion/PotionCard"
import { SUBSTITUTION } from "@game/core-src/games/mecard/sim/card/subs/summon/Substitution"
import {
    COIN,
    STONE_WALL,
    THORN_SHIELD,
    TOTEM,
} from "@game/core-src/games/mecard/sim/card/subs/summon/summons"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { THORN_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ThornHeartKind"
import { FLEETING } from "@game/core-src/games/mecard/sim/status/subs/Fleeting"
import { POISONED } from "@game/core-src/games/mecard/sim/status/subs/Poison"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../../../fixtures"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"

/** The summoned bodies of a battle still standing. */
function bodies(on: Battle): Unit[] {
    return on.living.filter(each => !each.decisive)
}

// --- Tests ---

describe("COIN", () => {
    test("thrown → a body of its team ahead, worn away, out of the order of play", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[thrower, chain(COIN)]])
        const [coin] = bodies(on)
        expect(coin.team).toBe(thrower.team)
        expect(coin.position.y).toBeCloseTo(3.5)
        expect(coin.statusOf(FLEETING)).toBeDefined()
        // Two halves, one worn away at the end of the round.
        expect(coin.life).toBe(1)
        expect(on.initiative).not.toContain(coin)
    })

    test("the summoning of the unit → as many more halves", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        thrower.stats.summon.base = 2
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[thrower, chain(COIN)]])
        expect(bodies(on)[0].life).toBe(3)
    })

    test("in the way of a shot → takes it in place of its thrower", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        const archer = unit(on, 3, 1, { team: MONSTERS, direction: Vector2.DOWN })
        on.startRound()
        thrower.hand.push(COIN)
        archer.hand.push(WAIT, SHOT)
        on.commit(thrower, chain(COIN))
        on.commit(archer, chain(WAIT, SHOT))
        on.endPreparation()
        on.playRound()
        expect(thrower.life).toBe(4)
    })

    test("aimed at by the closest → turned to, by the sturdiest → passed over", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        // The coin lands at (0,5, 6): closer to the aimer than its thrower.
        const aimer = unit(on, 1, 3, { team: MONSTERS, direction: Vector2.UP })
        thrower.direction = Vector2.LEFT
        play(on, [[thrower, chain(COIN)]])
        const [coin] = bodies(on)
        play(on, [[aimer, chain(AIM)]])
        const toCoin = coin.position.minus(aimer.position).normalized
        expect(aimer.direction.x).toBeCloseTo(toCoin?.x ?? 0)
        play(on, [[aimer, chain(STURDY_AIM)]])
        const toThrower = thrower.position.minus(aimer.position).normalized
        expect(aimer.direction.x).toBeCloseTo(toThrower?.x ?? 0)
    })

    test("its thrower's team gone → the battle over, the coin standing for nobody", () => {
        const on = battle()
        const thrower = unit(on, 3, 6, { hearts: [new Heart(RED_HEART)] })
        const monster = unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[thrower, chain(COIN)]])
        thrower.hearts.damage(1, DamageType.PHYSICAL, null)
        play(on, [[monster, chain(WAIT)]])
        expect(on.phase).toBe("over")
        expect(on.winner).toBe(MONSTERS)
    })
})

describe("STONE_WALL", () => {
    test("raised → three stones across, gone at the end of the round", () => {
        const on = battle()
        const mason = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        mason.hand.push(STONE_WALL)
        on.commit(mason, chain(STONE_WALL))
        on.endPreparation()
        for(let tick = 0; tick < 200 && bodies(on).length < 3; tick++) on.playStep()
        expect(bodies(on).map(each => each.position.y)).toEqual([5, 5, 5])
        on.playRound()
        expect(bodies(on)).toHaveLength(0)
    })
})

describe("THORN_SHIELD", () => {
    /** The hearts of the bush as soon as it is grown, before the round wears it away. */
    function grown(summoning: number): Heart[] {
        const on = battle()
        const gardener = unit(on, 3, 6)
        gardener.stats.summon.base = summoning
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        gardener.hand.push(THORN_SHIELD)
        on.commit(gardener, chain(THORN_SHIELD))
        on.endPreparation()
        for(let tick = 0; tick < 200 && bodies(on).length < 1; tick++) on.playStep()
        return bodies(on)[0].hearts.all
    }

    test("grown → a body of one thorn heart and no other", () => {
        const hearts = grown(0)
        expect(hearts).toHaveLength(1)
        expect(hearts.every(heart => heart.kind === THORN_HEART)).toBe(true)
    })

    test("the summoning of the unit → as many thorn hearts more", () => {
        const hearts = grown(1)
        expect(hearts).toHaveLength(2)
        expect(hearts.every(heart => heart.kind === THORN_HEART)).toBe(true)
    })
})

describe("TOTEM", () => {
    test("planted → its team around it healed at the end of the round", () => {
        const on = battle()
        const shaman = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        shaman.hearts.damage(2, DamageType.PHYSICAL, null)
        play(on, [[shaman, chain(TOTEM)]])
        expect(shaman.life).toBe(3)
    })
})

describe("SUBSTITUTION", () => {
    test("played → dashed back, a log where it stood, which takes the thrust", () => {
        const on = battle()
        const ninja = unit(on, 3, 3)
        const lancer = unit(on, 3, 1.5, { team: MONSTERS, direction: Vector2.DOWN })
        on.startRound()
        ninja.hand.push(SUBSTITUTION)
        lancer.hand.push(THRUST)
        on.commit(ninja, chain(SUBSTITUTION))
        on.commit(lancer, chain(THRUST))
        on.endPreparation()
        on.playRound()
        expectAt(ninja, 3, 6)
        expect(ninja.life).toBe(4)
    })
})

describe("BARREL", () => {
    test("set down then broken → its potion splashed around", () => {
        const on = battle()
        const brewer = unit(on, 3, 6)
        const hearts = Heart.many(RED_HEART, 8)
        const near = unit(on, 4, 4.5, { team: MONSTERS, hearts })
        play(on, [[brewer, chain(BARREL, POISON)]])
        // Worn away at the end of the round, it broke, and splashed its poison twice as strong.
        expect(bodies(on)).toHaveLength(0)
        expect(near.statusOf(POISONED)).toBeDefined()
    })
})

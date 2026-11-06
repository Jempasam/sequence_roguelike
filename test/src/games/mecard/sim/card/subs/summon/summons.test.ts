import { describe, expect, test } from "vitest"
import {
    AIM, BARREL, COIN, FLEETING, Heart, POISON, POISONED, RED_HEART, SHOT, STONE_WALL, STURDY_AIM,
    SUBSTITUTION, THORN_HEART, THORN_SHIELD, THRUST, TOTEM, Vector2, WAIT,
} from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../../../fixtures"

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
        thrower.hearts.damage(1, "physical", null)
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
        for(let tick = 0; tick < 200 && bodies(on).length < 3; tick++) on.tick()
        expect(bodies(on).map(each => each.position.y)).toEqual([5, 5, 5])
        on.playRound()
        expect(bodies(on)).toHaveLength(0)
    })
})

describe("THORN_SHIELD", () => {
    test("grown → a body with a thorn heart, lost first", () => {
        const on = battle()
        const gardener = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[gardener, chain(THORN_SHIELD)]])
        expect(bodies(on)[0].hearts.all.some(heart => heart.kind === THORN_HEART)).toBe(true)
    })
})

describe("TOTEM", () => {
    test("planted → its team around it healed at the end of the round", () => {
        const on = battle()
        const shaman = unit(on, 3, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        shaman.hearts.damage(2, "physical", null)
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

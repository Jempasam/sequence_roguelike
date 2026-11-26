import { describe, expect, test } from "vitest"
import { aiNamed, askAi, Heart, pathTo, RED_HEART, Rng, UNLIMITED_CARDS, Vector2 } from "@game/core/mecard"
import type { AiName, Battle, Unit } from "@game/core/mecard"

import { battle, HEROES, MONSTERS, unit, withPillars } from "../fixtures"

// --- Fixture builders ---

/** A battle in its preparation: a unit with only its moves, facing an enemy. */
function facing(on: Battle = battle()): { on: Battle, mover: Unit, foe: Unit } {
    const mover = on.add({
        name: "mobile", team: HEROES, controller: "player", position: new Vector2(3.5, 5.5), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [[]], unlimited: UNLIMITED_CARDS,
    })
    const foe = unit(on, 3.5, 1, { team: MONSTERS })
    on.startRound()
    return { on, mover, foe }
}

/** How far a unit has to walk to reach another, along the way around what stands between. */
function walking(on: Battle, from: Unit, to: Unit): number {
    const way = [from.position, ...pathTo(on, from, from.position, to), to.position]
    return way.slice(1).reduce((sum, point, index) => sum + point.distance(way[index]), 0)
}

/** Play the round an AI decides for the unit that moves. */
function played(name: AiName, on: Battle): { before: number, after: number } {
    const { mover, foe } = { mover: on.units.find(each => each.name === "mobile")!, foe: on.units.at(-1)! }
    const before = walking(on, mover, foe)
    on.commit(mover, askAi(on, mover, aiNamed(name, new Rng(4), 1)).chain)
    on.endPreparation()
    on.playRound()
    return { before, after: walking(on, mover, foe) }
}

// --- Tests ---

describe("smart8_path", () => {
    test("a pillar right before the enemy → it goes around, getting closer than smart8", () => {
        const behind = () => facing(withPillars(battle(), { center: new Vector2(3.5, 4.5), radius: 0.6 })).on
        const straight = played("smart8", behind())
        const around = played("smart8_path", behind())
        expect(straight.after).toBeGreaterThan(straight.before - 0.1)
        expect(around.after).toBeLessThan(around.before - 0.5)
    })

    test("a clear way → the same chain as smart8", () => {
        const chainOf = (name: AiName): string[] => {
            const { on, mover } = facing()
            const { chain } = askAi(on, mover, aiNamed(name, new Rng(4), 1))
            return chain.cards.map(card => `${card.name} ${"step" in card ? String(card.step) : ""}`)
        }
        expect(chainOf("smart8_path")).toEqual(chainOf("smart8"))
    })
})
